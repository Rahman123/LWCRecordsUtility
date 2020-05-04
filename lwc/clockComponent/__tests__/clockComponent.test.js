import { createElement } from 'lwc';
import ClockComponent from '../clockComponent.js';
import * as CONSTANTS from '../constants.js';
import * as HELPER from '../clockComponentHelper.js';

jest.mock('@salesforce/resourceUrl/timezonesdata', () => {}, {virtual: true});
jest.mock('@salesforce/resourceUrl/timeZoneDataCountryMap', () => {}, {virtual: true});
jest.mock('@salesforce/resourceUrl/citiesLatLongMap', () => {}, {virtual: true});
jest.mock('@salesforce/resourceUrl/citiesTrieData', () => {}, {virtual: true});


function createComponentUnderTest(params = {}) {
    const el = createElement('clockComponent', { is: ClockComponent });
    Object.assign(el, {
        record: {
            apiName: 'Custom_Object__c',
        }
    }, params);
    document.body.appendChild(el);
    el.getStaticResource = jest.fn();
    return el;
}

const select = (root, selector) => {
    return root.shadowRoot.querySelector(selector);
};

describe('clockComponent', () => {
    describe('clock-component', () => {
        it('tests happy path when static resource in null', () => {
            const config = {
                geoLocationFieldsData: null,
                addressFieldsData: null,
                storedClockData: null,
                parentWidth: "small",
                shouldRender: true,
            };
            const componentElement = createComponentUnderTest(config);
        });
    });

    describe('clock-component-helper', () => {
        it('test leven edit distance function', () => {
            let actualValue = HELPER.leven("abc", "abcd");
            let expectedValue = 1;
            expect(actualValue).toBe(expectedValue);
            actualValue = HELPER.leven("abc", "eabcd");
            expectedValue = 2;
            expect(actualValue).toBe(expectedValue);            
            actualValue = HELPER.leven("abc", "abc");
            expectedValue = 0;
            expect(actualValue).toBe(expectedValue);            
            actualValue = HELPER.leven("abc", "");
            expectedValue = 3;
            expect(actualValue).toBe(expectedValue);
        });
    });
    it('test object comparision function when param exists', () => {
        let obj = {a:1,b:{1:3}, c:{3:5}};
        let actualValue = HELPER.objectDupCheck(obj, "c");
        let expectedValue = "c";
        expect(actualValue).toBe(expectedValue);
    });

    it('test object comparision function when param exists but of a different case', () => {
        let obj = {a:1,b:{1:3}, c:{3:5}};
        let actualValue = HELPER.objectDupCheck(obj, "C");
        let expectedValue = "c";
        expect(actualValue).toBe(expectedValue);
    });


    it('test object comparision function when param does not exist', () => {
        let obj = {a:1,b:{1:3}, c:{3:5}};
        let actualValue = HELPER.objectDupCheck(obj, "d");
        expect(actualValue).toBe(null);
    });

    it('test array comparision function when param exists', () => {
        let arr = ["a","b","d","h"];
        let actualValue = HELPER.arrayDupCheck(arr, "b");
        let expectedValue = "b";
        expect(actualValue).toBe(expectedValue);
    });

    it('test array comparision function when param exists but of a different case', () => {
        let arr = ["a","b","d","h"];
        let actualValue = HELPER.arrayDupCheck(arr, "B");
        let expectedValue = "b";
        expect(actualValue).toBe(expectedValue);
    });

    it('test array comparision function when param does not exist', () => {
        let arr = ["a","b","d","h"];
        let actualValue = HELPER.arrayDupCheck(arr, "i");
        expect(actualValue).toBe(null);
    });

    it('test set char function', () => {
        let testStr = "test";
        let actualValue = HELPER.setCharAt(testStr, 0, "T");
        expect(actualValue).toBe("Test");
    });

    it('test point to tile', () => {
        let actualValue = HELPER.pointToTileFraction(33, 33, 8);
        let expectedValue = [151.46666666666667, 103.11672116189807, 8];
        expect(actualValue).toStrictEqual(expectedValue);
    });
});


