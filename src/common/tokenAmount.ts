import { BN } from "@project-serum/anchor"
import type { AccountInfo as TokenAccountInfo, MintInfo } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"

export class TokenAmount {
  /** Raw amount of token lamports */
  public lamports: BN
  /** Number of decimals configured for token's mint */
  public decimals: number
  /** Token amount as string for UI, accounts for decimals. Imprecise at large numbers */
  public uiTokens: string
  /** Token amount as a float, accounts for decimals. Imprecise at large numbers */
  public tokens: number

  public mint: PublicKey

  constructor(lamports: BN, decimals: number, mint: PublicKey) {
    if (!BN.isBN(lamports)) {
      console.warn("Amount is not a BN", lamports)
      lamports = new BN(0)
    }
    this.lamports = lamports
    this.decimals = decimals
    this.mint = mint
    this.tokens = TokenAmount.tokenAmount(lamports, decimals)
    this.uiTokens = this.tokens.toLocaleString("fullwide", { useGrouping: true }) //to prevent scientific numbers. Grouping adds commas
  }

  public static zero(decimals: number, mint: PublicKey) {
    return new TokenAmount(new BN(0), decimals, mint)
  }

  public static tokenAccount(tokenAccount: TokenAccountInfo, decimals: number) {
    return new TokenAmount(tokenAccount.amount, decimals, tokenAccount.mint)
  }

  public static mint(mint: MintInfo, mintAddress: PublicKey) {
    return new TokenAmount(new BN(mint.supply), mint.decimals, mintAddress)
  }

  public static tokens(tokenAmount: string, decimals: number, mint: PublicKey) {
    return new TokenAmount(TokenAmount.tokensToLamports(tokenAmount, decimals), decimals, mint)
  }

  private static tokenAmount(lamports: BN, decimals: number) {
    const str = lamports.toString(10, decimals)
    return parseFloat(str.slice(0, -decimals) + "." + str.slice(-decimals))
  }

  public static tokenPrice(marketValue: number, price: number, decimals: number, mint: PublicKey) {
    const tokens = price !== 0 ? marketValue / price : 0
    return TokenAmount.tokens(tokens.toFixed(decimals), decimals, mint)
  }

  // Convert a uiAmount string into lamports BN
  private static tokensToLamports(uiAmount: string, decimals: number) {
    // Convert from exponential notation (7.46e-7) to regular
    if (uiAmount.indexOf("e+") !== -1 || uiAmount.indexOf("e-") !== -1) {
      uiAmount = Number(uiAmount).toLocaleString("fullwide", { useGrouping: false })
    }

    let lamports: string = uiAmount

    // Remove commas
    while (lamports.indexOf(",") !== -1) {
      lamports = lamports.replace(",", "")
    }

    // Determine if there's a decimal, take number of
    // characters after it as fractionalValue
    let fractionalValue = 0
    const initialPlace = lamports.indexOf(".")
    if (initialPlace !== -1) {
      fractionalValue = lamports.length - (initialPlace + 1)

      // If fractional value is lesser than a lamport, round to nearest lamport
      if (fractionalValue > decimals) {
        lamports = String(parseFloat(lamports).toFixed(decimals))
      }

      // Remove decimal
      lamports = lamports.replace(".", "")
    }

    // Append zeros
    for (let i = 0; i < decimals - fractionalValue; i++) {
      lamports += "0"
    }

    // Return BN value in lamports
    return new BN(lamports)
  }

  public add(b: TokenAmount) {
    return this.do(b, BN.prototype.add)
  }

  public addb(b: BN) {
    return new TokenAmount(this.lamports.add(b), this.decimals, this.mint)
  }

  public addn(b: number) {
    return new TokenAmount(this.lamports.addn(b), this.decimals, this.mint)
  }

  public sub(b: TokenAmount) {
    return this.do(b, BN.prototype.sub)
  }

  public subb(b: BN) {
    return new TokenAmount(this.lamports.sub(b), this.decimals, this.mint)
  }

  public subn(b: number) {
    return new TokenAmount(this.lamports.subn(b), this.decimals, this.mint)
  }

  public mul(b: TokenAmount) {
    return this.do(b, BN.prototype.mul)
  }

  public mulb(b: BN) {
    return new TokenAmount(this.lamports.mul(b), this.decimals, this.mint)
  }

  public muln(b: number) {
    return new TokenAmount(this.lamports.muln(b), this.decimals, this.mint)
  }

  public div(b: TokenAmount) {
    return this.do(b, BN.prototype.div)
  }

  public divb(b: BN) {
    return new TokenAmount(this.lamports.div(b), this.decimals, this.mint)
  }

  public divn(b: number) {
    return new TokenAmount(this.lamports.divn(b), this.decimals, this.mint)
  }

  public lt(b: TokenAmount) {
    return this.lamports.lt(b.lamports)
  }

  public gt(b: TokenAmount) {
    return this.lamports.gt(b.lamports)
  }

  public eq(b: TokenAmount) {
    return this.lamports.eq(b.lamports)
  }

  public isZero() {
    return this.lamports.isZero()
  }

  private do(b: TokenAmount, fn: (b: BN) => BN) {
    if (this.decimals !== b.decimals) {
      console.warn("Decimal mismatch")
      return TokenAmount.zero(this.decimals, this.mint)
    }
    const amount = fn.call(this.lamports, b.lamports)
    return new TokenAmount(amount, this.decimals, this.mint)
  }
}
