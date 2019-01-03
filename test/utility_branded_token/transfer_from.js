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

const utils = require('../test_lib/utils');
const UtilityBrandedTokenUtils = require('./utils');

contract('UtilityBrandedToken::transferFrom', async (accounts) => {
    let testUtilityBrandedToken;
    let internalActors;
    let tokenHolder1;
    let tokenHolder2;
    let tokenHolder3;
    let worker;
    let accountProvider;

    const approvalAmount = 50;
    const amount = 10;
    const tokenHolder1Balance = 100;

    beforeEach(async () => {
        accountProvider = new utils.AccountProvider(accounts);
        tokenHolder1 = accountProvider.get();
        tokenHolder2 = accountProvider.get();
        tokenHolder3 = accountProvider.get();
        worker = accountProvider.get();

        internalActors = [];
        internalActors.push(tokenHolder1);
        internalActors.push(tokenHolder3);

        ({
            testUtilityBrandedToken,
            worker,
        } = await UtilityBrandedTokenUtils.setupUtilityBrandedToken(
            accountProvider, internalActors,
        ));

        await testUtilityBrandedToken.registerInternalActor(
            internalActors,
            { from: worker },
        );

        await testUtilityBrandedToken.setBalance(tokenHolder1, tokenHolder1Balance);

        await testUtilityBrandedToken.approve(
            tokenHolder3,
            approvalAmount,
            { from: tokenHolder1 },
        );
    });

    describe('Negative Tests', async () => {
        it('Reverts if to address is not registered internal actor', async () => {
            await utils.expectRevert(testUtilityBrandedToken.transferFrom(
                tokenHolder1,
                tokenHolder2,
                amount,
                { from: tokenHolder3 },
            ),
            'To address should be registered internal actor',
            'To address is not an internal actor.');
        });
    });

    describe('Storage', async () => {
        it('Validate the transfer to internal actor', async () => {
            internalActors.push(tokenHolder2);
            await testUtilityBrandedToken.registerInternalActor(
                internalActors,
                { from: worker },
            );
            assert.strictEqual(
                (await testUtilityBrandedToken.balanceOf(tokenHolder2)).cmp(
                    web3.utils.toBN(0),
                ),
                0,
                'Balance of tokenholder2 should be zero',
            );

            await testUtilityBrandedToken.transferFrom(
                tokenHolder1,
                tokenHolder2,
                amount,
                { from: tokenHolder3 },
            );

            assert.strictEqual(
                (await testUtilityBrandedToken.balanceOf(tokenHolder2)).cmp(
                    web3.utils.toBN(amount),
                ),
                0,
                `Balance of tokenholder should be ${amount}`,
            );
        });
    });
});
