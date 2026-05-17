#!/bin/bash

# Ensure a log file was passed
if [ -z "$1" ]; then
  echo "Usage: $0 <log_file>"
  exit 1
fi

LOG_FILE=$1
OUTPUT_FILE="contractaddress.js"

# Extract the contract address from Forge broadcast output
# Matches "Contract Address: 0x..." or "deployed at: 0x..."
ADDRESS=$(grep -Eo '0x[a-fA-F0-9]{40}' "$LOG_FILE" | head -n 1)

if [ -n "$ADDRESS" ]; then
  echo "const CONTRACT_ADDRESS = \"$ADDRESS\";" > "$OUTPUT_FILE"
  echo "Extracted Contract Address: $ADDRESS -> $OUTPUT_FILE"
else
  echo "Failed to find a contract address in $LOG_FILE"
fi
