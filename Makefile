.PHONY: all clean build test deploy-anvil deploy-sepolia

-include .env

all: clean build test

clean:
	forge clean
	rm -rf contract-deploy-logs/*.log

build:
	forge build

test:
	forge test -vvv

deploy-anvil: clean build test
	@mkdir -p contract-deploy-logs
	@rm -f contract-deploy-logs/anvil-deploy.log
	forge script script/DeployElectionFactory.s.sol:DeployElection --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast | tee contract-deploy-logs/anvil-deploy.log
	@bash bashScript/extract_address.sh contract-deploy-logs/anvil-deploy.log

deploy-sepolia: clean build test
	@mkdir -p contract-deploy-logs
	@rm -f contract-deploy-logs/sepolia-deploy.log
	forge script script/DeployElectionFactory.s.sol:DeployElection --rpc-url $(SEPOLIA_RPC_URL) -i 1 --broadcast --verify --etherscan-api-key $(ETHERSCAN_API_KEY) | tee contract-deploy-logs/sepolia-deploy.log
	@bash bashScript/extract_address.sh contract-deploy-logs/sepolia-deploy.log
