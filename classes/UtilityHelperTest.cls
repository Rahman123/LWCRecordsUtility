@isTest
public with sharing class UtilityHelperTest {

    @isTest static void testGetRecordByName() {
        String input = '';
        recutility360__UtilityNote__c expected = null;
        System.assertEquals(expected, UtilityHelper.getRecordByName(input));
    }

    @isTest static void testCreateTask() {
        boolean happyPath = false;
        try {
            UtilityHelper.createTask('testUrl', '2020-6-6T12:3:0', 'Asia/Kolkata', 'testSubject');
            happyPath = true;
        } catch (Exception e) {
            happyPath = false;
        }
        System.assert(happyPath, 'Create task failed');
    }

    @isTest static void testGetGeolocationsFields() {
        String[] fieldsNames = new List<String>();
        boolean happyPath = false;
        try {
            UtilityHelper.getGeolocationsFields('0015w00002A8BXpAAN', 'Account', fieldsNames);
            happyPath = true;
        } catch (Exception e) {
            happyPath = false;
        }
        System.assert(happyPath, 'Get geolocations failed');
    }
}