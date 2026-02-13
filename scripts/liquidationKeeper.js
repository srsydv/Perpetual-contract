const hre = require("hardhat");
const { ethers } = require("ethers");


const CONFIG = {
    CONTRACT_ADDRESS: process.env.PERPETUAL_EXCHANGE_ADDRESS || "",
    
    RPC_URL: process.env.RPC_URL || "http://localhost:8545",
    
    KEEPER_PRIVATE_KEY: process.env.KEEPER_PRIVATE_KEY || "",
    
    POLL_INTERVAL: parseInt(process.env.POLL_INTERVAL || "30"), // 30 seconds default
    
    MAX_GAS_PRICE: ethers.parseUnits(process.env.MAX_GAS_PRICE || "100", "gwei"),
    
    MIN_LIQUIDATION_REWARD: ethers.parseUnits(process.env.MIN_LIQUIDATION_REWARD || "10", 18),
};

class LiquidationKeeper {
    constructor(config) {
        this.config = config;
        this.provider = new ethers.JsonRpcProvider(config.RPC_URL);
        this.wallet = new ethers.Wallet(config.KEEPER_PRIVATE_KEY, this.provider);
        this.contract = null;
        this.isRunning = false;
    }

    async initialize() {
        if (!this.config.CONTRACT_ADDRESS) {
            throw new Error("PERPETUAL_EXCHANGE_ADDRESS environment variable must be set");
        }
        if (!this.config.KEEPER_PRIVATE_KEY) {
            throw new Error("KEEPER_PRIVATE_KEY environment variable must be set");
        }

        const PerpetualExchange = await hre.ethers.getContractFactory("PerpetualExchange");
        this.contract = PerpetualExchange.attach(this.config.CONTRACT_ADDRESS).connect(this.wallet);

        console.log("✅ Keeper initialized");
        console.log(`   Contract: ${this.config.CONTRACT_ADDRESS}`);
        console.log(`   Keeper: ${this.wallet.address}`);
        console.log(`   Poll interval: ${this.config.POLL_INTERVAL}s`);
    }

    async findLiquidatablePositions() {
        try {
            const liquidatable = await this.contract.getLiquidatableActiveTrades();
            return liquidatable;
        } catch (error) {
            console.error("❌ Error finding liquidatable positions:", error.message);
            return [];
        }
    }

    async getActiveTradesWithHealth() {
        try {
            const [traders, healthBps] = await this.contract.getActiveTradesWithHealth();
            return { traders, healthBps };
        } catch (error) {
            console.error("❌ Error fetching active trades with health:", error.message);
            return { traders: [], healthBps: [] };
        }
    }

    async liquidatePosition(traderAddress) {
        try {
            const position = await this.contract.positions(traderAddress);
            const marginRatio = await this.contract.getMarginRatio(traderAddress);
            
            console.log(`\n🔍 Checking position for ${traderAddress}:`);
            console.log(`   Margin: ${ethers.formatUnits(position.margin, 18)} USDC`);
            console.log(`   Margin Ratio: ${marginRatio / 100}%`);
            
            const isLiquidatable = await this.contract.isLiquidatable(traderAddress);
            if (!isLiquidatable) {
                console.log(`   ⚠️  Position is not liquidatable (margin ratio above threshold)`);
                return false;
            }

            if (position.margin < this.config.MIN_LIQUIDATION_REWARD) {
                console.log(`   ⚠️  Margin too low, skipping (not profitable)`);
                return false;
            }

            const gasEstimate = await this.contract.liquidate.estimateGas(traderAddress);
            const gasPrice = await this.provider.getFeeData();
            const gasCost = gasEstimate * (gasPrice.gasPrice || 0n);
            
            if (gasPrice.gasPrice > this.config.MAX_GAS_PRICE) {
                console.log(`   ⚠️  Gas price too high: ${ethers.formatUnits(gasPrice.gasPrice, "gwei")} gwei`);
                return false;
            }

            console.log(`   💰 Estimated reward: ${ethers.formatUnits(position.margin, 18)} USDC`);
            console.log(`   ⛽ Estimated gas cost: ${ethers.formatEther(gasCost)} ETH`);

            console.log(`   🚀 Executing liquidation...`);
            const tx = await this.contract.liquidate(traderAddress, {
                gasLimit: gasEstimate * 120n / 100n,
            });
            
            console.log(`   📝 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            
            console.log(`   ✅ Liquidation successful!`);
            console.log(`   📊 Gas used: ${receipt.gasUsed.toString()}`);
            
            return true;
        } catch (error) {
            console.error(`   ❌ Liquidation failed for ${traderAddress}:`, error.message);
            return false;
        }
    }

    async liquidateBatch(positions) {
        if (positions.length === 0) return 0;

        try {
            console.log(`\n🔄 Attempting batch liquidation of ${positions.length} positions...`);
            
            const tx = await this.contract.liquidateBatch(positions, {
                gasLimit: 5000000n, 
            });
            
            console.log(`   📝 Batch transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            
            const successCount = await this.contract.liquidateBatch.staticCall(positions);
            
            console.log(`   ✅ Batch liquidation completed: ${successCount} positions liquidated`);
            return successCount;
        } catch (error) {
            console.error(`   ❌ Batch liquidation failed:`, error.message);
            return 0;
        }
    }

    async run() {
        this.isRunning = true;
        console.log("\n🤖 Liquidation Keeper started");
        console.log("   Press Ctrl+C to stop\n");

        while (this.isRunning) {
            try {
                const liquidatable = await this.findLiquidatablePositions();
                
                if (liquidatable.length > 0) {
                    console.log(`\n⚠️  Found ${liquidatable.length} liquidatable position(s)`);
                    
                    for (const trader of liquidatable) {
                        await this.liquidatePosition(trader);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                } else {
                    console.log(`✓ No liquidatable positions found (${new Date().toISOString()})`);
                }
            } catch (error) {
                console.error("❌ Error in monitoring loop:", error.message);
            }

            await new Promise(resolve => setTimeout(resolve, this.config.POLL_INTERVAL * 1000));
        }
    }

    stop() {
        console.log("\n🛑 Stopping keeper...");
        this.isRunning = false;
    }
}

async function main() {
    const keeper = new LiquidationKeeper(CONFIG);
    
    process.on('SIGINT', () => {
        keeper.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        keeper.stop();
        process.exit(0);
    });
    
    await keeper.initialize();
    await keeper.run();
}

if (require.main === module) {
    main().catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}

module.exports = { LiquidationKeeper };
