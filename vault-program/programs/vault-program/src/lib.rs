use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("986ARRxoPAkVTAP4YcKyGMyyLm5736s3g2ZXp9aNqxFs");

const VAULT_SEED: &[u8] = b"vault";
const DEPOSITOR_SEED: &[u8] = b"depositor";
const SHARE_MINT_SEED: &[u8] = b"share_mint";
const VAULT_USDC_SEED: &[u8] = b"vault_usdc";
const MAX_WITHDRAW_BPS: u64 = 8_000;
const BPS_DENOMINATOR: u64 = 10_000;
const INITIAL_NAV: u64 = 1_000_000; // 1.000000 USDC (6 decimals)

// ─── State ───────────────────────────────────────────────────────────────────

#[account]
pub struct Vault {
    pub manager: Pubkey,
    pub usdc_mint: Pubkey,
    pub vault_usdc: Pubkey,
    pub share_mint: Pubkey,
    pub total_shares: u64,
    pub nav_per_share: u64,
    pub deposit_cap: u64,
    pub manager_withdrawn: u64,
    pub bump: u8,
}

#[account]
pub struct VaultDepositor {
    pub vault: Pubkey,
    pub depositor: Pubkey,
    pub shares: u64,
    pub bump: u8,
}

// ─── Errors ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum VaultError {
    #[msg("Deposit would exceed vault cap")]
    DepositCapExceeded,
    #[msg("Insufficient shares for withdrawal")]
    InsufficientShares,
    #[msg("Manager withdraw would exceed 80% of vault")]
    WithdrawCapExceeded,
    #[msg("Outstanding manager balance must be returned first")]
    OutstandingManagerBalance,
    #[msg("Arithmetic overflow")]
    Overflow,
}

// ─── Program ─────────────────────────────────────────────────────────────────

#[program]
pub mod vault_program {
    use super::*;

    /// Step 1: create vault state + USDC custody account.
    pub fn initialize_vault(ctx: Context<InitializeVault>, deposit_cap: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.manager = ctx.accounts.manager.key();
        vault.usdc_mint = ctx.accounts.usdc_mint.key();
        vault.vault_usdc = ctx.accounts.vault_usdc.key();
        vault.share_mint = Pubkey::default(); // filled by setup_share_mint
        vault.total_shares = 0;
        vault.nav_per_share = INITIAL_NAV;
        vault.deposit_cap = deposit_cap;
        vault.manager_withdrawn = 0;
        vault.bump = ctx.bumps.vault;
        Ok(())
    }

    /// Step 2: create share mint and link it to the vault.
    pub fn setup_share_mint(ctx: Context<SetupShareMint>) -> Result<()> {
        ctx.accounts.vault.share_mint = ctx.accounts.share_mint.key();
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, usdc_amount: u64) -> Result<()> {
        // ── Read what we need before any borrows ──
        let bump = ctx.accounts.vault.bump;
        let total_shares = ctx.accounts.vault.total_shares;
        let manager_withdrawn = ctx.accounts.vault.manager_withdrawn;
        let deposit_cap = ctx.accounts.vault.deposit_cap;
        let vault_balance = ctx.accounts.vault_usdc.amount;

        // Enforce deposit cap
        let total_deployed = vault_balance
            .checked_add(manager_withdrawn)
            .ok_or(VaultError::Overflow)?;
        require!(
            total_deployed
                .checked_add(usdc_amount)
                .ok_or(VaultError::Overflow)?
                <= deposit_cap,
            VaultError::DepositCapExceeded
        );

        // Calculate shares to mint
        let shares = if total_shares == 0 {
            usdc_amount
        } else {
            usdc_amount
                .checked_mul(total_shares)
                .ok_or(VaultError::Overflow)?
                .checked_div(total_deployed)
                .ok_or(VaultError::Overflow)?
        };

        // Transfer USDC depositor → vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.depositor_usdc.to_account_info(),
                    to: ctx.accounts.vault_usdc.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            usdc_amount,
        )?;

        // Mint shares to depositor (vault PDA is mint authority)
        let seeds = &[VAULT_SEED, &[bump]];
        let signer = &[&seeds[..]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.share_mint.to_account_info(),
                    to: ctx.accounts.depositor_shares.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            shares,
        )?;

        // Update state
        let vault = &mut ctx.accounts.vault;
        vault.total_shares = vault
            .total_shares
            .checked_add(shares)
            .ok_or(VaultError::Overflow)?;

        let depositor_record = &mut ctx.accounts.vault_depositor;
        if depositor_record.depositor == Pubkey::default() {
            depositor_record.vault = ctx.accounts.vault.key();
            depositor_record.depositor = ctx.accounts.depositor.key();
            depositor_record.bump = ctx.bumps.vault_depositor;
        }
        depositor_record.shares = depositor_record
            .shares
            .checked_add(shares)
            .ok_or(VaultError::Overflow)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        let bump = ctx.accounts.vault.bump;
        let nav_per_share = ctx.accounts.vault.nav_per_share;
        let total_shares = ctx.accounts.vault.total_shares;

        require!(
            ctx.accounts.vault_depositor.shares >= shares,
            VaultError::InsufficientShares
        );

        let usdc_out = shares
            .checked_mul(nav_per_share)
            .ok_or(VaultError::Overflow)?
            .checked_div(INITIAL_NAV)
            .ok_or(VaultError::Overflow)?;

        let seeds = &[VAULT_SEED, &[bump]];
        let signer = &[&seeds[..]];

        // Burn shares from depositor
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.share_mint.to_account_info(),
                    from: ctx.accounts.depositor_shares.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            shares,
        )?;

        // Transfer USDC vault → depositor
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_usdc.to_account_info(),
                    to: ctx.accounts.depositor_usdc.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            usdc_out,
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.total_shares = total_shares
            .checked_sub(shares)
            .ok_or(VaultError::Overflow)?;

        let depositor_record = &mut ctx.accounts.vault_depositor;
        depositor_record.shares = depositor_record
            .shares
            .checked_sub(shares)
            .ok_or(VaultError::Overflow)?;

        Ok(())
    }

    /// Manager pulls USDC from vault to hot wallet for LP trading.
    pub fn manager_withdraw(ctx: Context<ManagerWithdraw>, amount: u64) -> Result<()> {
        let bump = ctx.accounts.vault.bump;
        let manager_withdrawn = ctx.accounts.vault.manager_withdrawn;
        let vault_balance = ctx.accounts.vault_usdc.amount;

        require!(manager_withdrawn == 0, VaultError::OutstandingManagerBalance);

        let max_withdraw = vault_balance
            .checked_mul(MAX_WITHDRAW_BPS)
            .ok_or(VaultError::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(VaultError::Overflow)?;
        require!(amount <= max_withdraw, VaultError::WithdrawCapExceeded);

        let seeds = &[VAULT_SEED, &[bump]];
        let signer = &[&seeds[..]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_usdc.to_account_info(),
                    to: ctx.accounts.manager_usdc.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        ctx.accounts.vault.manager_withdrawn = amount;
        Ok(())
    }

    /// Manager returns USDC + fees; updates NAV per share.
    pub fn manager_return(ctx: Context<ManagerReturn>, amount: u64) -> Result<()> {
        let total_shares = ctx.accounts.vault.total_shares;
        let vault_balance = ctx.accounts.vault_usdc.amount;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.manager_usdc.to_account_info(),
                    to: ctx.accounts.vault_usdc.to_account_info(),
                    authority: ctx.accounts.manager.to_account_info(),
                },
            ),
            amount,
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.manager_withdrawn = 0;

        if total_shares > 0 {
            let new_balance = vault_balance
                .checked_add(amount)
                .ok_or(VaultError::Overflow)?;
            vault.nav_per_share = new_balance
                .checked_mul(INITIAL_NAV)
                .ok_or(VaultError::Overflow)?
                .checked_div(total_shares)
                .ok_or(VaultError::Overflow)?;
        }

        Ok(())
    }
}

// ─── Account Contexts ─────────────────────────────────────────────────────────

/// Step 1: vault state + USDC custody (2 init accounts — fits in one frame).
#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub manager: Signer<'info>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = manager,
        space = 8 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1,
        seeds = [VAULT_SEED],
        bump,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        init,
        payer = manager,
        token::mint = usdc_mint,
        token::authority = vault,
        seeds = [VAULT_USDC_SEED],
        bump,
    )]
    pub vault_usdc: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// Step 2: share mint creation (1 init account — tiny frame).
#[derive(Accounts)]
pub struct SetupShareMint<'info> {
    #[account(mut, constraint = manager.key() == vault.manager)]
    pub manager: Signer<'info>,

    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        init,
        payer = manager,
        mint::decimals = 6,
        mint::authority = vault,
        seeds = [SHARE_MINT_SEED],
        bump,
    )]
    pub share_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        seeds = [VAULT_USDC_SEED],
        bump,
        token::mint = vault.usdc_mint,
        token::authority = vault,
    )]
    pub vault_usdc: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [SHARE_MINT_SEED], bump)]
    pub share_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        token::mint = vault.usdc_mint,
        token::authority = depositor,
    )]
    pub depositor_usdc: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = share_mint,
        associated_token::authority = depositor,
    )]
    pub depositor_shares: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = depositor,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [DEPOSITOR_SEED, depositor.key().as_ref()],
        bump,
    )]
    pub vault_depositor: Box<Account<'info, VaultDepositor>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [VAULT_USDC_SEED],
        bump,
        token::mint = vault.usdc_mint,
        token::authority = vault,
    )]
    pub vault_usdc: Account<'info, TokenAccount>,

    #[account(mut, seeds = [SHARE_MINT_SEED], bump)]
    pub share_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = vault.usdc_mint,
        token::authority = depositor,
    )]
    pub depositor_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = share_mint,
        associated_token::authority = depositor,
    )]
    pub depositor_shares: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [DEPOSITOR_SEED, depositor.key().as_ref()],
        bump = vault_depositor.bump,
        constraint = vault_depositor.depositor == depositor.key(),
    )]
    pub vault_depositor: Account<'info, VaultDepositor>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManagerWithdraw<'info> {
    #[account(mut, constraint = manager.key() == vault.manager)]
    pub manager: Signer<'info>,

    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [VAULT_USDC_SEED],
        bump,
        token::mint = vault.usdc_mint,
        token::authority = vault,
    )]
    pub vault_usdc: Account<'info, TokenAccount>,

    #[account(mut, token::mint = vault.usdc_mint, token::authority = manager)]
    pub manager_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ManagerReturn<'info> {
    #[account(mut, constraint = manager.key() == vault.manager)]
    pub manager: Signer<'info>,

    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [VAULT_USDC_SEED],
        bump,
        token::mint = vault.usdc_mint,
        token::authority = vault,
    )]
    pub vault_usdc: Account<'info, TokenAccount>,

    #[account(mut, token::mint = vault.usdc_mint, token::authority = manager)]
    pub manager_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
