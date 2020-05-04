import { createElement } from 'lwc';
import Utility360 from '../utility360.js';

function createComponentUnderTest(params = {}) {
    const el = createElement('utility360', { is: Utility360 });
    Object.assign(el, {
        record: {
            apiName: 'Account',
        }
    }, params);
    document.body.appendChild(el);
    el.getStaticResource = jest.fn();
    return el;
}

describe('Notes compoenent', () => {
    describe('utility-360', () => {
        it('tests happy path', () => {
            const config = {
                flexipageRegionWidth: "SMALL",
                recordId: "0015w00002A8BXpAAN",
                objectApiName: "Account",
                storagetype: "Device"         
            };
            const componentElement = createComponentUnderTest(config);
        });
    });
});
