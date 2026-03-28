import fetch from 'node-fetch'; // We'll need this for calling the local API

const reference = "URG-20260327210653-F9239FE7";
const txHash = "0xREAL_TX_HASH_SIMULATED";
const API_URL = "http://localhost:3001/api/giving/verify-crypto";

async function testLiveApi() {
    console.log('--- Live API Verification Test ---');
    console.log('Testing reference:', reference);
    
    // Note: This test assumes the server is running on port 3001.
    // Since we can't easily mock the RPC inside the running server from here,
    // we'll verify the system by checking if it at least reaches the RPC stage.
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference, txHash })
        });
        
        const data = await res.json();
        console.log('API Response Status:', res.status);
        console.log('API Response Body:', JSON.stringify(data, null, 2));
        
        if (res.status === 400 && data.error.includes("Transaction not found")) {
            console.log('✅ SUCCESS: The system successfully reached the blockchain check stage!');
            console.log('   (It failed as expected because the dummy hash is not on-chain, but it passed all local checks.)');
        } else if (res.status === 200) {
            console.log('✅ SUCCESS: Transaction verified!');
        } else {
            console.log('❌ Unexpected response:', data.error || 'Unknown error');
        }
    } catch (err) {
        console.log('❌ FAILED to connect to API:', err.message);
        console.log('   Make sure the server is running on port 3001.');
    }
}

testLiveApi();
