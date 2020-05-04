public with sharing class UtilityHelper {

    // Using this method since getRecord wire does not support getting records by name
    @AuraEnabled(cacheable=true)
    public static recutility360__UtilityNote__c getRecordByName(string recordId) {
        recutility360__UtilityNote__c note = null;
            try {
                note = [SELECT Id, note_data__c, clockdata__c FROM recutility360__UtilityNote__c WHERE UtilityNote__c.Name = :recordId limit 1];
                return note;
            } catch (Exception ex) {
                return note;
            }
    }

    // Using this method since getRecord wire does not provide the geocode values for Billing and Shipping address
    @AuraEnabled(cacheable=true)
    public static sObject getGeolocationsFields(string recordId, string objectApiName, string[] fieldNames ) {
        String del = ', ';
        sObject note = null;
        if(objectApiName == '' || fieldNames.size() == 0) {
            return null;
        }
        String fieldNamesQuery = string.join(fieldNames, del);
        try {
            note = Database.query('SELECT ' + fieldNamesQuery  + ' FROM ' + objectApiName + ' WHERE id = :recordId');
            return note;
        } catch (Exception ex) {
            return note;
        }
    }
    
    // Using this method since there is no wire support to create a task
    @AuraEnabled
    public static void createTask(string recordUrl, string dateTimeReminder, string timeZoneIdString, string subject) {  
        List<String> dateTimeReminderList = dateTimeReminder.split('T');
        String dateString = dateTimeReminderList[0];
        String timeString = dateTimeReminderList[1];
        List<String> dateStringList = dateString.split('-');
        List<String> timeStringList = timeString.split(':');

        DateTime dateTimeForReminder = DateTime.newInstanceGMT(Integer.valueOf(dateStringList[0]), Integer.valueOf(dateStringList[1]), Integer.valueOf(dateStringList[2]), Integer.valueOf(timeStringList[0]), Integer.valueOf(timeStringList[1]),0);
        
        Datetime now = Datetime.now(); 
        double offset = 0;
        if(timeZoneIdString != 'Local Timezone') {
            offset = ((double)UserInfo.getTimezone().getOffset(now))/86400000; 
        }
        double remTime = dateTimeForReminder.getTime();
        double currTime = Datetime.now().getTime();
        double offsetInDaysForGmt = (double)(remTime - currTime)/86400000;
        double offsetInDays = 0;
        TimeZone tz = TimeZone.getTimeZone(timeZoneIdString);
        long temp = tz.getOffset(System.now());
        offsetInDays = ((double)temp)/86400000; 
        Task newTask = new Task(Description = recordUrl,
                                Priority = 'High',
                                IsReminderSet = true,
                                ReminderDateTime = DateTime.now() - offsetInDays + offsetInDaysForGmt + offset + 0.0006944444,
                                Subject = subject
                                );
        insert newTask;
    }  
}