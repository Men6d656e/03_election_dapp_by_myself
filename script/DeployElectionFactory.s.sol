// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ElectionFactory} from "../src/Election.sol";

contract DeployElection is Script {
    function run() public {
        // Broadcast interactions
        vm.startBroadcast();
        ElectionFactory electionFactory = new ElectionFactory();
        console.log("ElectionFactory deployed at:", address(electionFactory));
        vm.stopBroadcast();
    }
}
