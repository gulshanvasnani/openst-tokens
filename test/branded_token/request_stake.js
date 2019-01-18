// Copyright 2018 OpenST Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const BN = require('bn.js');
const { AccountProvider } = require('../test_lib/utils.js');
const { Event } = require('../test_lib/event_decoder.js');

const web3 = require('../test_lib/web3.js');
const brandedTokenUtils = require('./utils');

contract('BrandedToken::requestStake', async () => {
    // TODO: add negative tests

    contract('Event', async (accounts) => {
        const accountProvider = new AccountProvider(accounts);


        it('Emits StakeRequested event.', async () => {
            const {
                brandedToken,
            } = await brandedTokenUtils.setupBrandedToken(
                accountProvider,
            );

            const stake = 1;
            const mint = await brandedToken.convertToBrandedTokens(stake);
            const staker = accountProvider.get();

            const transactionResponse = await brandedToken.requestStake(
                stake,
                mint,
                { from: staker },
            );

            const events = Event.decodeTransactionResponse(
                transactionResponse,
            );

            assert.strictEqual(
                events.length,
                1,
            );

            Event.assertEqual(events[0], {
                name: 'StakeRequested',
                args: {
                    _stakeRequestHash: await brandedToken.stakeRequestHashes(staker),
                    _staker: staker,
                    _stake: new BN(stake),
                    // global nonce is incremented after assignment to a stake request
                    _nonce: (await brandedToken.nonce()).subn(1),
                },
            });
        });
    });

    contract('Storage', async (accounts) => {
        const accountProvider = new AccountProvider(accounts);

        it('Successfully stores stake request data', async () => {
            const {
                brandedToken,
            } = await brandedTokenUtils.setupBrandedToken(
                accountProvider,
            );

            const stake = 1;
            const mint = await brandedToken.convertToBrandedTokens(stake);
            const staker = accountProvider.get();

            const stakeRequestHash = await brandedToken.requestStake.call(
                stake,
                mint,
                { from: staker },
            );

            await brandedToken.requestStake(
                stake,
                mint,
                { from: staker },
            );

            assert.strictEqual(
                stakeRequestHash,
                await brandedToken.stakeRequestHashes(staker),
            );

            const stakeRequest = await brandedToken.stakeRequests(stakeRequestHash);

            assert.strictEqual(
                stakeRequest.staker,
                staker,
            );

            assert.strictEqual(
                stakeRequest.stake.cmp(
                    new BN(stake),
                ),
                0,
            );

            assert.strictEqual(
                stakeRequest.nonce.cmp(
                    // global nonce is incremented after assignment to a stake request
                    (await brandedToken.nonce()).subn(1),
                ),
                0,
            );
        });

        it('Calculates stakeRequestHash per EIP 712', async () => {
            const {
                brandedToken,
                stakeRequestHash,
            } = await brandedTokenUtils.setupBrandedTokenAndStakeRequest(
                accountProvider,
            );

            const BT_STAKE_REQUEST_TYPEHASH = web3.utils.soliditySha3(
                'StakeRequest(address staker,uint256 stake,uint256 nonce)',
            );
            const stakeRequest = await brandedToken.stakeRequests(stakeRequestHash);
            const calculatedHash = web3.utils.soliditySha3(
                web3.eth.abi.encodeParameters(
                    [
                        'bytes32',
                        'address',
                        'uint256',
                        'uint256',
                    ],
                    [
                        BT_STAKE_REQUEST_TYPEHASH,
                        stakeRequest.staker,
                        stakeRequest.stake.toNumber(),
                        stakeRequest.nonce.toNumber(),
                    ],
                ),
            );

            assert.strictEqual(
                calculatedHash,
                stakeRequestHash,
            );
        });
    });
});