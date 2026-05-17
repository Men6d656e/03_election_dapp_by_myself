// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ElectionFactory} from "../src/Election.sol";

contract CounterTest is Test {
    ElectionFactory public electionFactory;
    address owner = address(1);
    address voter1 = address(2);
    address voter2 = address(3);

    function setUp() public {
        vm.prank(owner);
        electionFactory = new ElectionFactory();
    }

    function test_CreateElection() public {
        vm.prank(owner);
        string[] memory candidates = new string[](2);
        candidates[0] = "Alice";
        candidates[1] = "Bob";
        electionFactory.createElection("Presidential", candidates);

        assertEq(electionFactory.getElectionTitle(0), "Presidential");
        // assertEq(electionFactory.getCandidates(0).lenght, 2);
        assertEq(electionFactory.getCandidates(0)[0].name, "Alice");
    }

    function test_vote() public {
        vm.startPrank(owner);
        string[] memory candidates = new string[](2);
        candidates[0] = "Alice";
        candidates[1] = "Bob";
        electionFactory.createElection("Presidential", candidates);
        vm.stopPrank();

        vm.prank(voter1);
        electionFactory.vote(0, 0);

        ElectionFactory.Candidate[] memory returnedCandidates = electionFactory
            .getCandidates(0);
        assertEq(returnedCandidates[0].voteCount, 1);
        assertEq(returnedCandidates[1].voteCount, 0);
    }

    function testRevert_DoubleVoting() public {
        vm.startPrank(owner);
        string[] memory candidates = new string[](2);
        candidates[0] = "Alice";
        candidates[1] = "Bob";
        electionFactory.createElection("Presidential", candidates);
        vm.stopPrank();

        vm.startPrank(voter1);
        electionFactory.vote(0, 0);
        vm.expectRevert("You have already voted in the election");
        electionFactory.vote(0, 0);
        vm.stopPrank();
    }
}
