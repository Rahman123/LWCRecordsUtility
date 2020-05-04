import { LightningElement, api, track } from 'lwc';
import timezonesdata from '@salesforce/resourceUrl/timezonesdata';
import timeZoneDataCountryMap from '@salesforce/resourceUrl/timeZoneDataCountryMap';
import citiesTrieData from '@salesforce/resourceUrl/citiesTrieData';
import citiesLatLongMap from '@salesforce/resourceUrl/citiesLatLongMap';
import * as CONSTANTS from './constants.js';
import * as HELPER from './clockComponentHelper.js';
import FORM_FACTOR from '@salesforce/client/formFactor';

export default class ClockComponent extends LightningElement {
    /**
     * The timezone data from the geolocation fields of the record
     */
    @api geoLocationFieldsData;
    /**
     * The timezone data from the address fields of the record
     */
    @api addressFieldsData;
    /**
     * The timezone data from the custom timezones added by the user
     */
    @api storedClockData;
    /**
     * The width of the main region
     */
    @api parentWidth;
    @api shouldRender;

    /**
     * The timezone and time data of all the clocks
     */
    @track clocks = [];
    @track timestamp = new Date();
    @track openModal = false;
    /**
     * Options data for the add time timezone picklists
     */
    @track countryPicklistOptions = [];
    @track cityPicklistOptions = [];
    @track statePicklistOptions = [];
    @track placeholderText = CONSTANTS.SEARCH_PLACEHOLDER_TEXT;
    /**
     * Search results of the queried address data
     */
    @track searchResults = [];
    @track showDeleteTimeZoneButton = false;
    @track addedTimezoneList = [];

    /**
     * Default display values
     */
    timeZone = "America/Los_Angeles";
    selectedButtonLabel = "Select Timezone"
    sectionActionIcon = "utility:dash";
    sectionIconSize = "medium";

    clocksToBeStored = [];
    allSearchResults =[];
    selectedTimezonesFordelete = [];

    /**
     * Default conditional render values
     */
    showCityPicklist = false;
    showCountryPicklist = false;
    showStatePicklist = false;
    initiallyRenderedGeoFields = false;
    initiallyRenderedClockData = false;
    initiallyRenderedAddressData = false;
    /**
     * Current selected picklist value
     */
    currentCityPicklistValue = null;
    currentStatePicklistValue = null;
    currentCountryPicklistValue = null;

    isSearchReadyToSave = false;
    isPicklistReadyToSave = false;
    isSelectedCityDup = false;
    selectedCityFromSearch = null;
    hasSelectionBeenMade = false;
    seachPicklistValue = '';

    currentClockId = 0;
    widthInitiallySet = false;

    cityNamesForEditDistSearch = [];
    additionalClockDataFound= false;

    /**
     * Force refresh timestamp
     */
    @api
    refresh() {
        this.timestamp = new Date();
    }

    /**
     * Hanlde for the main container to obtain current clock data
     */
    @api
    getCurrentClockData() {
        return this.clocks;
    }

    /**
     * Display the populated timezones
     */
    get addedTimezoneDisplayString() {
        let formattedTimezoneArray = [];
        this.addedTimezoneList.forEach((tz) => 
        { 
            formattedTimezoneArray.push(tz.value+'('+tz.label+')');       
        });
        return "Selected timezones to be added - " + formattedTimezoneArray.join(',');
    }

    /**
     * Classlist for the main container based on the flexipage region width
     */
    get getFormattedClassForClockContainer() {
        let classList = "clock slds-box slds-grid slds-wrap slds-p-around_medium slds-col clockmaincontainer";
        if(FORM_FACTOR === "Large") {
            if(this.parentWidth === "SMALL") {
                return classList + " slds-size_1-of-2";
            } else if (this.parentWidth === "MEDIUM") {
                return classList + " slds-size_1-of-4";
            } else if (this.parentWidth === "LARGE") {
                return classList + " slds-size_1-of-6";
            }
        } else {
            return classList + " slds-size_1-of-1";
        }
        return classList;
    }

    /**
     * Loads all the static resources into the objects
     */
    connectedCallback() {
        if(timezonesdata){          
            this.timezoneJsonToShow  = this.getStaticResource(timezonesdata);
        }
        if(timeZoneDataCountryMap){          
            this.timeZoneDataCountryMap = this.getStaticResource(timeZoneDataCountryMap);
        }
        if(citiesTrieData){          
            this.citiesTrieData = this.getStaticResource(citiesTrieData);
        }
        if(citiesLatLongMap){          
            this.citiesLatLongMap = this.getStaticResource(citiesLatLongMap);
        }
    }

    /**
     * Performs post rendereing takss for address, geolocation and stored clock data
     */
    renderedCallback() {
        debugger;
        if(!this.currentClockId) {
            this.currentClockId = 0
        }
        if(!this.initiallyRenderedGeoFields) {
            let  geoLocationFieldsData = JSON.parse(JSON.stringify(this.geoLocationFieldsData))
            if(geoLocationFieldsData &&   Object.keys(geoLocationFieldsData).length > 0) {
                for (let field in geoLocationFieldsData) {
                    let lat = geoLocationFieldsData[field]["Latitude"];
                    let lon = geoLocationFieldsData[field]["Longitude"];
                    let tileData = this.pointToTile(lon,lat,8);
                    let timeZone;
                    if(this.timezoneJsonToShow[tileData[0] + '/' + tileData[1] + '/8']) {
                        timeZone = this.timezoneJsonToShow[tileData[0] + '/' + tileData[1] + '/8'];

                        this.clocks.push({
                            id : this.currentClockId + 1,
                            timeZone : timeZone,
                            label : "(Local time processed from Geolocation  field - " + geoLocationFieldsData[field].label +")",
                        })
                        this.currentClockId  += 1;
                    }
                }
                this.initiallyRenderedGeoFields = true;             
            }

        }

        if(!this.initiallyRenderedAddressData) {
            let addressFieldsData = {};
            if(JSON.stringify(this.addressFieldsData) && JSON.stringify(this.addressFieldsData) !== "{}") {
                addressFieldsData = JSON.parse(JSON.stringify(this.addressFieldsData))
            }
            if(addressFieldsData &&   Object.keys(addressFieldsData).length > 0) {
                addressFieldsData = this.checkAndValidateAddressData(addressFieldsData);
                for (let address in addressFieldsData) {
                    let lat = addressFieldsData[address]["Latitude"];
                    let lon = addressFieldsData[address]["Longitude"];
                    let tileData = this.pointToTile(lon,lat,8);
                    let timeZone;
                    if(this.timezoneJsonToShow[tileData[0] + '/' + tileData[1] + '/8']) {
                        timeZone = this.timezoneJsonToShow[tileData[0] + '/' + tileData[1] + '/8'];
                    }
                    this.clocks.push({
                        id : this.currentClockId + 1,
                        timeZone : timeZone,
                        label : "(Local time processed from address field - " + addressFieldsData[address].label +")",
                    })
                    this.currentClockId  += 1;
                }
                this.initiallyRenderedAddressData = true;             
            }
        }

        if(!this.initiallyRenderedClockData) {
            if(!this.currentClockId) {
                this.currentClockId = 0
            }
            if(typeof(this.storedClockData) === "string") {
                this.storedClockData = JSON.parse(this.storedClockData);
            }
            if(this.storedClockData &&   Object.keys(this.storedClockData).length > 0) {
                    for (let index in this.storedClockData) {
                        this.clocks.push({
                            id : this.currentClockId + 1,
                            timeZone : this.storedClockData[index].timeZone,
                            label : this.storedClockData[index].label,
                        });
                        this.clocksToBeStored.push({
                            id : this.currentClockId + 1,
                            timeZone : this.storedClockData[index].timeZone,
                            label : this.storedClockData[index].label,
                        });
                        this.currentClockId += 1
                    }
                this.initiallyRenderedClockData = true;
            }   
        }

        if(this.shouldRender) {
            if(this.cityNamesForEditDistSearch && this.cityNamesForEditDistSearch.length > 0) {
                this.additionalClockDataFound = true;
            }
        }
    }

    getStaticResource(resourceName) {
        let request = new XMLHttpRequest();
        try {
        request.open("GET", resourceName, false);
        request.send(null);  
        return JSON.parse(request.responseText);  
        } catch (ex) {
            // Failure to communicate
        }
        return null;
    }

    /**
     * Validates the address with the existing data and cleans the address to display the timezone
     */
    checkAndValidateAddressData(addressFieldsData) {
        for(let address in addressFieldsData) {
            let processedCountry = null;
            let processedState = null;
            let processedCity = null;
            if(addressFieldsData[address].hasOwnProperty("Latitude") && addressFieldsData[address].hasOwnProperty("Longitude")) {
                addressFieldsData[address]["Latitude"] = addressFieldsData[address]["Latitude"].split('.')[0];
                addressFieldsData[address]["Longitude"] = addressFieldsData[address]["Longitude"].split('.')[0];
                continue;
            } else {
                if (addressFieldsData[address].hasOwnProperty("Country") && addressFieldsData[address]["Country"]) {
                    let searchedResult = HELPER.objectDupCheck(this.timeZoneDataCountryMap, this.addressFieldsData[address]["Country"]);
                    if(searchedResult) {
                        processedCountry = searchedResult;
                    } else {
                        for(let country in this.timeZoneDataCountryMap) {
                            searchedResult = HELPER.arrayDupCheck(this.timeZoneDataCountryMap[country]["altNames"], this.addressFieldsData[address]["Country"]);
                            if(searchedResult) {
                                processedCountry = country;
                                break;
                            }
                        }
                    }
                }
                
                if(addressFieldsData[address].hasOwnProperty("State") && addressFieldsData[address]["State"]) {
                    if(processedCountry) {
                        let searchResult = HELPER.objectDupCheck(this.timeZoneDataCountryMap[processedCountry]["state/province"], addressFieldsData[address]["State"]);
                        if(searchResult) {
                            processedState = searchResult;
                        }
                    } else {
                        for(let country in this.timeZoneDataCountryMap) {
                            let searchResult = HELPER.objectDupCheck(this.timeZoneDataCountryMap[country]["state/province"], addressFieldsData[address]["State"]);
                            if(searchResult) {
                                processedState = searchResult;
                                processedCountry = country;
                                break;
                            }
                        }
                    }
                }

                if(addressFieldsData[address].hasOwnProperty("City") && addressFieldsData[address]["City"]) {
                    if(processedCountry && processedState) {
                        let cityObject = this.timeZoneDataCountryMap[processedCountry]["state/province"][processedState];
                        let searchresult = HELPER.objectDupCheck(cityObject, addressFieldsData[address]["City"]);
                        if(searchresult) {
                            processedCity = searchresult;
                        }
                    } else if (processedCountry) {
                        for(let country in this.timeZoneDataCountryMap) {
                            for(let state in this.timeZoneDataCountryMap[country]["state/province"]) {
                                let searchResult = HELPER.objectDupCheck(this.timeZoneDataCountryMap[country]["state/province"][state], addressFieldsData[address]["City"]);
                                if(searchResult) {
                                    processedCity = searchResult;
                                    break
                                }
                            }
                            if(processedCity) {
                                break;
                            }
                        }
                    } else {
                        let searchResult = HELPER.objectDupCheck(this.citiesLatLongMap, addressFieldsData[address]["City"]);
                        if(searchResult) {
                            addressFieldsData[address]["Latitude"] = this.citiesLatLongMap[searchResult]["Latitude"];
                            addressFieldsData[address]["Longitude"] = this.citiesLatLongMap[searchResult]["Longitude"];
                            continue;
                        }
                    }
                }
            }

            if(!processedCity) {
                if(addressFieldsData[address].hasOwnProperty("City") && addressFieldsData[address]["City"]) {
                    this.cityNamesForEditDistSearch.push(addressFieldsData[address]["City"]);
                }
                delete addressFieldsData[address];
            } else if (processedCountry && processedState && processedCity) {
                addressFieldsData[address]["Latitude"] = this.timeZoneDataCountryMap[processedCountry]["state/province"][processedState][processedCity]["Latitude"];
                addressFieldsData[address]["Longitude"] = this.timeZoneDataCountryMap[processedCountry]["state/province"][processedState][processedCity]["Longitude"];                
            } else if(processedCity && processedCountry) {
                if(HELPER.arrayDupCheck(this.timeZoneDataCountryMap[processedCountry]["cities"], processedCity)) {
                    for(let state in this.timeZoneDataCountryMap[processedCountry]["state/province"]) {
                        let searchResult = HELPER.objectDupCheck(this.timeZoneDataCountryMap[processedCountry]["state/province"][state], processedCity);
                        if(searchResult) {
                            addressFieldsData[address]["Latitude"] = this.timeZoneDataCountryMap[processedCountry]["state/province"][state][searchResult]["Latitude"];
                            addressFieldsData[address]["Longitude"] = this.timeZoneDataCountryMap[processedCountry]["state/province"][state][searchResult]["Longitude"];   
                            break;
                        }
                    }
                }
            } else if(processedCity) {
                addressFieldsData[address]["Latitude"] = this.citiesLatLongMap[processedCity]["Latitude"];
                addressFieldsData[address]["Longitude"] = this.citiesLatLongMap[processedCity]["Longitude"];
            }
        }
        return addressFieldsData;
    }

    /**
     * Fires an event every time clock data is updated so that the container in notified
     */
    fireClockDateUpdatedEvent() {
        const selectedEvent = new CustomEvent('clockdataupdate',
         {  bubbles     : true,
            composed    : true,
            isTrusted : true,
            detail      : this.clocksToBeStored });
        try{
        this.dispatchEvent(selectedEvent);
        } catch(e) {
            console.log(e)
        }
        this.initiallyRenderedClockData = true;
    }

    handleAddTimezone() {
        this.openModal = true;
        this.showCountryPicklist = true;
        let unSortedPickListOptions = Object.keys(this.timeZoneDataCountryMap);
        unSortedPickListOptions.sort();
        this.countryPicklistOptions = [];
        for (let country of unSortedPickListOptions) {
            this.countryPicklistOptions.push({label:country,value:country});
        }
    }

    handleCountryPicklistChange(e) {
        this.showStatePicklist = true;
        let unSortedPickListOptions = Object.keys(this.timeZoneDataCountryMap[e.detail.value]["state/province"]);
        unSortedPickListOptions.sort();
        this.statePicklistOptions = [];
        this.currentCountryPicklistValue = e.detail.value;
        for (let state of unSortedPickListOptions) {
            this.statePicklistOptions.push({label:state,value:state});
        }
    }

    handleStatePicklistChange(e) {
        this.showCityPicklist = true;
        this.cityPicklistOptions = [];
        let unSortedPickListOptions = Object.keys(this.timeZoneDataCountryMap[this.currentCountryPicklistValue]["state/province"][e.detail.value]);
        unSortedPickListOptions.sort();
        this.cityPicklistOptions = [];
        this.currentStatePicklistValue = e.detail.value;

        for (let city of unSortedPickListOptions) {
            this.cityPicklistOptions.push({label:city,value:city});
        }
    }

    handleCityPicklistChange(e) {
        this.currentCityPicklistValue = e.detail.value;
        this.isPicklistReadyToSave = true;
    }

    hanldeModalSave() {
        for(let i in this.addedTimezoneList) {
            this.handleAddNewTimezone(this.addedTimezoneList[i]);
        }
        this.fireClockDateUpdatedEvent();
        this.placeholderText = CONSTANTS.SEARCH_PLACEHOLDER_TEXT;
        this.hasSelectionBeenMade = false;
        this.addedTimezoneList = [];
    }

    /**
     * Gets the timezone based on the latitude nad longitude
     */
    getTimezoneFromLatlong(lat,lon) {
        let tileData = this.pointToTile(lon,lat,8);
        let timeZone;
        if(this.timezoneJsonToShow[tileData[0] + '/' + tileData[1] + '/8']) {
            timeZone = this.timezoneJsonToShow[tileData[0] + '/' + tileData[1] + '/8'];
        }
        return timeZone;
    }
    
    /**
     * Saves the added timezone into the stored clocks so that it can be updated further into the database
     */
    handleAddNewTimezone(timeZone) {
        let value = timeZone.value;
        let label = timeZone.label;
        this.clocks.push(
            {
                id : this.currentClockId + 1,
                timeZone : value,
                label : label,
            }
        );

        this.clocksToBeStored.push(
            {
                id : this.currentClockId + 1,
                timeZone : value,
                label : label,
            }
        );
        
        this.currentClockId += 1;
        this.openModal = false;
        this.handleResetModal();
    }

    /**
     * Reset modal values
     */
    handleResetModal() {
        this.showCityPicklist = false;
        this.showCountryPicklist = false;
        this.showStatePicklist = false;
        this.cityPicklistOptions = [];
        this.statePicklistOptions = [];
        this.currentCityPicklistValue = null;
        this.currentStatePicklistValue = null;
        this.currentCountryPicklistValue = null;
    }

    handleModalClose() {
        this.openModal = false;
        this.handleResetModal();
        this.addedTimezoneList = [];
        this.placeholderText = CONSTANTS.SEARCH_PLACEHOLDER_TEXT;
        this.hasSelectionBeenMade = false;
    }

    handleSelectTimezoneToggle() {
        if(this.selectedButtonLabel === "Select Timezone") {
            this.selectedButtonLabel = "Clear selections";
            this.showDeleteTimeZoneButton = true;
        } else {
            this.selectedButtonLabel = "Select Timezone";
            this.showDeleteTimeZoneButton = false;
        }
    }

    handleSelectTimezone(e) {
        if(e.target.dataset.timezoneid) {
            if(this.selectedTimezonesFordelete.includes(e.target.dataset.timezoneid)) {
                for(let i in this.selectedTimezonesFordelete) {
                    if(e.target.dataset.timezoneid === this.selectedTimezonesFordelete[i]) {
                        this.selectedTimezonesFordelete.splice(i,1)
                        break;
                    }
                }
            } else {
                this.selectedTimezonesFordelete.push(e.target.dataset.timezoneid);
            }
        }
    }

    handleDeleteSelectedTimezones() {
        for(let id in this.selectedTimezonesFordelete) {
            for(let i in this.clocks) {
                if(this.clocks[i].id + "" === (this.selectedTimezonesFordelete[id] + "")) {
                    this.clocks.splice(i,1)
                    break;
                }
            }

            for(let i in this.clocksToBeStored) {
                if(this.clocksToBeStored[i].id + "" === (this.selectedTimezonesFordelete[id] + "")) {
                    this.clocksToBeStored.splice(i,1)
                    break;
                }
            }
        }
        this.selectedTimezonesFordelete = [];
        this.handleSelectTimezoneToggle();
        this.fireClockDateUpdatedEvent();
    }

    handleInputFromSearch(event) {
        let charCode = event.keyCode;
        if(this.placeholderText === CONSTANTS.SEARCH_PLACEHOLDER_TEXT) this.placeholderText = "";
        let searchQueryUpdated = true;
        if(parseInt(charCode) > 64 && parseInt(charCode) < 91) {
            this.placeholderText += String.fromCharCode(parseInt(event.keyCode) + 32);
        } else if(parseInt(charCode) === 8 || parseInt(charCode) === 46) { 
            this.placeholderText = this.placeholderText.slice(0,-1);
        } else if(parseInt(charCode) === 32) { 
            this.placeholderText += " ";
        } else if(parseInt(charCode) === 222) { 
            this.placeholderText += "'";
        } else if(parseInt(charCode) === 188) { 
            this.placeholderText += ",";
        } else {
            searchQueryUpdated = false;
        }

        if(searchQueryUpdated) {
            this.updateSearchResults();
        }
    }

    updateSearchResults() {
        this.startsWith(this.placeholderText);
        this.searchResults = [];
        this.allSearchResults = this.allSearchResults.slice(0,100);

        this.allSearchResults.forEach((prefix) => {
            this.searchResults.push({label:prefix, value:prefix});
        });
    }

    handleSelectFromSearch(event) {
        this.isSearchReadyToSave = true;
        this.selectedCityFromSearch = event.detail.value;
    }

    /**
     * USes the trie data structure to obatin search results
     */
    startsWith(prefix) {
        this.allSearchResults = [];
        let t = this.citiesTrieData;
        for(let i in prefix) {
            if(!(prefix[i] in t)) { 
                if(!(prefix[i].toLowerCase() in t)) {
                    if(!(prefix[i].toUpperCase() in t)) {
                        return false;
                    } else {
                        prefix = HELPER.setCharAt(prefix, i, prefix[i].toUpperCase());
                        t = t[prefix[i].toUpperCase()];
                    }
                }
                else {
                    prefix = HELPER.setCharAt(prefix, i, prefix[i].toLowerCase());
                    t = t[prefix[i].toLowerCase()];
                }
            } else {
                t = t[prefix[i]];
            }
        }
        this.getPrefixWords(t, prefix);
        return true;
    }

    /**
     * Uses the trie data structure to obtain the search results
     */
    getPrefixWords(subTrie,prefix) {
        for(let t in subTrie) {
            if(t === "$$$") {
                this.allSearchResults.push(prefix);
            } else {
                this.getPrefixWords(subTrie[t], prefix + t);
            }
        }
    }

    pointToTile(lon, lat, z) {
        let tile = HELPER.pointToTileFraction(lon, lat, z);
        tile[0] = Math.floor(tile[0]);
        tile[1] = Math.floor(tile[1]);
        return tile;
    }    

    hanldeAddTimezoneFromPicklist() {
        let lat = this.timeZoneDataCountryMap[this.currentCountryPicklistValue]["state/province"][this.currentStatePicklistValue][this.currentCityPicklistValue]["Latitude"];
        let lon = this.timeZoneDataCountryMap[this.currentCountryPicklistValue]["state/province"][this.currentStatePicklistValue][this.currentCityPicklistValue]["Longitude"];

        let timeZone = this.getTimezoneFromLatlong(lat,lon);
        this.addedTimezoneList.push({label:this.currentCityPicklistValue,value:timeZone});
        this.isPicklistReadyToSave = false;
        this.handleResetModal();
        this.showCountryPicklist = true;
        this.hasSelectionBeenMade = true
    }

    hanldeAddTimezoneFromSearch() {
        let selectedCity = this.selectedCityFromSearch.split(',');
        let lat;
        let lon;
        if(selectedCity.length > 1) {
            lat = this.timeZoneDataCountryMap[selectedCity[2]]["state/province"][selectedCity[1]][selectedCity[0]]["Latitude"];
            lon = this.timeZoneDataCountryMap[selectedCity[2]]["state/province"][selectedCity[1]][selectedCity[0]]["Longitude"];
        } else {
            lat = this.citiesLatLongMap[selectedCity[0]]["Latitude"];
            lon = this.citiesLatLongMap[selectedCity[0]]["Longitude"];
        }
        let timeZone = this.getTimezoneFromLatlong(lat,lon);
        this.addedTimezoneList.push({label:selectedCity[0],value:timeZone});
        this.isSearchReadyToSave = false;
        this.selectedCityFromSearch = null;
        this.searchResults = [];
        this.hasSelectionBeenMade = true
        this.placeholderText = CONSTANTS.SEARCH_PLACEHOLDER_TEXT;
        this.searchPicklistValue = selectedCity;
    }

    /**
     * Hanlde collapse section
     */
    toggleSectionView() {
        let section = this.template.querySelector("div.slds-section");
        if(section) {
            let sectionButton = section.querySelector("button.slds-section__title-action");
            if(section.classList.contains("slds-is-open")) {
                section.classList.remove("slds-is-open");
                sectionButton.style.height = "100px";
                this.sectionActionIcon = "utility:add";
                this.sectionIconSize = "large";
            } else {
                this.sectionActionIcon = "utility:dash";
                section.classList.add("slds-is-open");
                sectionButton.style.height = "";
                this.sectionIconSize = "medium";
            }
        }
    }

    /**
     * Peforms the edit distance search to check for spell errors in the address data
     */
    handleEditDistSearch() {
        if(this.cityNamesForEditDistSearch && this.cityNamesForEditDistSearch.length > 0) {
            for(let cityName of this.cityNamesForEditDistSearch) {
                for(let city in this.citiesLatLongMap) {
                    if(HELPER.leven(city.toLowerCase(),cityName.toLowerCase()) === 1) {
                        let lat = this.citiesLatLongMap[city]["Latitude"];
                        let lon = this.citiesLatLongMap[city]["Longitude"];
                        let tileData = this.pointToTile(lon,lat,8);
                        let timeZone;
                        if(this.timezoneJsonToShow[tileData[0] + '/' + tileData[1] + '/8']) {
                            timeZone = this.timezoneJsonToShow[tileData[0] + '/' + tileData[1] + '/8'];
                            this.clocks.push({
                                id : this.currentClockId + 1,
                                timeZone : timeZone,
                                label : city,
                            })
                            this.currentClockId  += 1;
                        }
                        break;
                    }
                }
            }
            this.additionalClockDataFound = false;
            this.cityNamesForEditDistSearch = [];
        }
    }
}