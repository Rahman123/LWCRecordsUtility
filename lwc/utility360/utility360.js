import { LightningElement, track, wire, api } from 'lwc';
import { createRecord, updateRecord } from 'lightning/uiRecordApi';
import { getRecord, deleteRecord } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import createTask from '@salesforce/apex/UtilityHelper.createTask';
import getGeolocationsFields from '@salesforce/apex/UtilityHelper.getGeolocationsFields';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRecordByName from '@salesforce/apex/UtilityHelper.getRecordByName';
import FORM_FACTOR from '@salesforce/client/formFactor';

export default class Utility360 extends LightningElement {
    /**
     * Flexipage region width of the main container
     */
    @api flexipageRegionWidth;
    /**
     * Id of the displayed record
     */
    @api recordId;
    @api isLocalStorage;
    /**
     * The note transparency level
     */
    @api opacityLevel;
    /**
     * Object name of the current record
     */
    @api objectApiName;
    /**
     * The type of storage currently being used
     */
    @api storagetype;

    /**
     * The custom clock data from the user
     */
    @track storedClockData = [];
    /**
     * The notes data for the lightning-datatable
     */
    @track dataTableData = [];
    /**
     * The notes array with al the notes objects
     */
    @track notes = [];

    /**
     * The getRecord data of the current record
     */
    recordData;
    /**
     * The geolocation feild names to be sent to the clockComponent
     */
    geoLocationFields = {};
    /**
     * The address feild names to be sent to the clockComponent
     */
    addressFields = {};
    /**
     * The geolocation feilds data to be sent to the clockComponent
     */
    geoLocationFieldsData = {};
    /**
     * The address feilds data to be sent to the clockComponent
     */
    addressFieldsData = {};

    /**
     * The data loading status values
     */
    wireDataLoaded = false;
    isDragToggleEnabled = false;
    isDragEnabled = false;
    /**
     * The current note status values
     */
    currentSelectedNoteId;
    clockData = [];
    tableActionsAdded = false;
    showCreateReminderPicklist= false;
    openModal = false;
    currentTimezonestOptions = [];
    currentSelectedTimezoneValue = "Local Timezone";
    selectedReminderDateTime = '';
    isFieldsQueryRequired = false;
    queriedRecord = null;

    /**
     * Default display locators
     */
    sectionActionIcon = "utility:dash";
    sectionIconSize = "medium";
    addNoteLabel = "New Note";
    addNoteIconNme = "utility:add";

    noteRecordId = null;
    localStorageLoaded= false;
    initialNoteRecordData = false;
    triggerRerender = false;
    noteRecordDataLoaded = false;
    /**
     * Note initial positions
     */
    pos1 = 0;
    pos2 = 0;
    pos3 = 0;
    po4 = 0;
    isDrgaEnabled = false;
    /**
     * Wire data tracker
     */
    hasDataLoaded = {
            record : false,
            object : false,
        storedData : false,
    }
    /**
     * Row actions object
     */
    actions = [
        { label: 'Focus Note', name: 'focusNote' },
    ];
    /**
     * Lightning datatable config object
     */
    columns = [
        { id: 1, label: 'Note Label', fieldName: 'fieldName', type: "text", wrapText: true},
        { id: 2, label: 'Comment', fieldName: 'comment', type: "text", wrapText: true},
        {   
            type: 'action',
            typeAttributes: { rowActions: this.actions },
        }
    ];
    
    noteSelected = null;
    dirtyNotesId = new Set();
    locations = {};
    timeZones = [];
    locationsMap = {}
    currentMaxId = 0;

    /**
     * Formafactor pivot for notes in mobile
     */
    get shouldDisplayNotes() {
        if(FORM_FACTOR === "Large") {
            return true;
        }
        return false;
    }

    /**
     * Get the note record if exists related to this record
     */
    @wire(getRecordByName, { recordId: '$recordId'})
    handleGetNoteRecord(record) {
        debugger;
        let wireCompleted = false;
        if(record.data) {
            this.initialNoteRecordData = record;
            wireCompleted = true;
        } else if (record.error) {
            wireCompleted = true;
        } else if (typeof(record.data) !== "undefined") {
            wireCompleted = true;
        }

        if(wireCompleted) {
            this.initialNoteRecordDataLoaded = true;
            this.hasDataLoaded.storedData = true;
            if(this.hasDataLoaded.object && this.hasDataLoaded.record) {
                this.triggerRerender = true;
            }
            try {
                if(this.localStorageLoaded) {
                    this.handleNoteRecordLoaded(record);
                }
            } catch (ex) {     
                // fail gracefully 
            }
        }
    }

    /**
     * Get the record data of the current record
     */
    @wire(getRecord, {recordId: '$recordId', layoutTypes: ["Full"]})
    handleGetRecord(record) {
        if(record.data) {
            this.hasDataLoaded.record = true;
            this.recordData = record.data;
            if(this.hasDataLoaded.object === true) {
                this.handleWireDataLoaded();
            }
        } else if(record.error) {
            this.handleWireDataLoaded()
        }
    }

    /**
     * Get the object info of this record
     */
    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    handleObjectInfo(objectInfo) {
        if(objectInfo.data) {
            for (let field in objectInfo.data.fields) { 
                if(objectInfo.data.fields[field].dataType === "Location") {
                    this.geoLocationFields[objectInfo.data.fields[field].apiName] = {
                        label : objectInfo.data.fields[field].label,
                    };
                } 

                if(objectInfo.data.fields[field].dataType === "Address") {
                    this.addressFields[objectInfo.data.fields[field].apiName] = {
                        label : objectInfo.data.fields[field].label,
                    }
                } 
            } 
            for (let geoFields in this.geoLocationFields) {
                for (let field in objectInfo.data.fields) { 
                    if(objectInfo.data.fields[field].compoundFieldName === geoFields) {
                        if(objectInfo.data.fields[field].apiName.includes("Latitude")) {
                            this.geoLocationFields[geoFields]["Latitude"] = objectInfo.data.fields[field].apiName;
                        } else {
                            this.geoLocationFields[geoFields]["Longitude"] = objectInfo.data.fields[field].apiName;
                        }
                    }
                }

            }

            for (let addressField in this.addressFields) {
                for (let field in objectInfo.data.fields) { 
                    if(objectInfo.data.fields[field].compoundFieldName === addressField) {
                        if(objectInfo.data.fields[field].apiName.includes("Latitude")) {
                            this.addressFields[addressField]["Latitude"] = objectInfo.data.fields[field].apiName;
                        } else if (objectInfo.data.fields[field].apiName.includes("Longitude")) {
                            this.addressFields[addressField]["Longitude"] = objectInfo.data.fields[field].apiName;
                        } else if (objectInfo.data.fields[field].apiName.includes("City")) {
                            this.addressFields[addressField]["City"] = objectInfo.data.fields[field].apiName;
                        } else if (objectInfo.data.fields[field].apiName.includes("Country")) {
                            this.addressFields[addressField]["Country"] = objectInfo.data.fields[field].apiName;
                        } else if (objectInfo.data.fields[field].apiName.includes("Country")) {
                            this.addressFields[addressField]["Country"] = objectInfo.data.fields[field].apiName;
                        } else if (objectInfo.data.fields[field].apiName.includes("State")) {
                            this.addressFields[addressField]["State"] = objectInfo.data.fields[field].apiName;
                        }
                    }
                }

            }

            let fieldsToBeQueried = [];
            for(let address in this.addressFields) {
                for(let field in this.addressFields[address]) {
                    if(field === "Latitude" || field === "Longitude") {
                        fieldsToBeQueried.push(this.addressFields[address][field]);
                    }
                }
            }

            if(fieldsToBeQueried.length > 0) {
                this.isFieldsQueryRequired = true;
                getGeolocationsFields({recordId: this.recordId, objectApiName: this.objectApiName, fieldNames: fieldsToBeQueried})
                .then((record) => {
                    this.queriedRecord = record;
                    this.setObjectDataLoaded();
                }).catch((error) => {
                    // No op
                })
            } else {
                this.setObjectDataLoaded();
            }   
        } else if (objectInfo.error) {
            this.setObjectDataLoaded();
        }
    }

    connectedCallback() {
        this.noteLocations = JSON.parse(localStorage.getItem("noteLocationsOf" + this.recordId));
        this.clockData = JSON.parse(localStorage.getItem("clockDataOf" + this.recordId));
        this.localStorageLoaded = true;
        if(this.initialNoteRecordDataLoaded) {
            this.handleNoteRecordLoaded(this.initialNoteRecordData);
        }
    }

    renderedCallback() {
        let noteContainers = this.template.querySelectorAll("div[data-dirtystate=true]");

        for(let note of noteContainers) {
            if(this.locations.hasOwnProperty(note.dataset.notenumber)) {
                note.style.top = this.locations[note.dataset.notenumber].top;
                note.style.left = this.locations[note.dataset.notenumber].left;
            }
        }
    }

    /**
     * Notify object data has been loaded
     */
    setObjectDataLoaded() {
        this.hasDataLoaded.object = true
        if(this.hasDataLoaded.record === true) {
            this.handleWireDataLoaded();
        }
    }

    /**
     * Process loaded wire record data
     */
    handleNoteRecordLoaded(record) {
        if(!this.noteRecordDataLoaded) {
            if(record.data) {
                this.noteRecordId = record.data.Id;
            }
            if(this.storagetype === "Device") {
                if(record.data) {
                    deleteRecord(this.noteRecordId);
                }
                this.locations = this.noteLocations;
                this.storedClockData = this.clockData;
            } else {
                if(this.locations && Object.keys(this.locations).length > 0) {
                    localStorage.removeItem("noteLocationsOf" + this.recordId);
                }
                if (this.clockData && Object.keys(this.clockData).length > 0)  {
                    localStorage.removeItem("clockDataOf" + this.recordId);
                }
                if(record.data) {
                    if(record.data.recUtility360__note_data__c) this.locations = JSON.parse(record.data.recUtility360__note_data__c);
                    if(record.data.recUtility360__clockdata__c) this.storedClockData = JSON.parse(record.data.recUtility360__clockdata__c);
                }
            }
            this.noteRecordDataLoaded = true;
            this.setupNotesFromData();
        }
    }

    /**
     * Process loaded wire record data
     */
    handleWireDataLoaded() {
        let geoLocationFieldsData = {};
        let addressFieldsData = {};
        try {
            if(!this.wireDataLoaded && this.recordData) {
                if(this.geoLocationFields) {
                    for (let geoField in this.geoLocationFields) {
                        if(this.recordData.fields.hasOwnProperty(this.geoLocationFields[geoField]["Latitude"]) && 
                        this.recordData.fields.hasOwnProperty(this.geoLocationFields[geoField]["Longitude"]))
                        {
                            geoLocationFieldsData[geoField] = {}
                            geoLocationFieldsData[geoField]["Latitude"] = this.recordData.fields[this.geoLocationFields[geoField]["Latitude"]].value;
                            geoLocationFieldsData[geoField]["Longitude"] = this.recordData.fields[this.geoLocationFields[geoField]["Longitude"]].value;
                            geoLocationFieldsData[geoField]["label"] = this.geoLocationFields[geoField]["label"];
                        }
                    }
                }
                if(this.addressFields) {
                    for (let addressField in this.addressFields) {
                        addressFieldsData[addressField] = {}
                        for (let field in this.addressFields[addressField]) {
                            if(field !== "label") {
                                if(field === "Latitude" || field === "Longitude") {  
                                    if(this.queriedRecord && this.queriedRecord.hasOwnProperty(this.addressFields[addressField][field])) {
                                        addressFieldsData[addressField][field] = this.queriedRecord[this.addressFields[addressField][field]];
                                    }
                                    continue;
                                }
                                addressFieldsData[addressField][field] = this.recordData.fields[this.addressFields[addressField][field]].value;
                            }
                        }
                        addressFieldsData[addressField]["label"] = this.addressFields[addressField]["label"];
                    }
                }
            }
        } catch (ex) {
            // Fail gracefully
        }
        this.wireDataLoaded = true
        this.geoLocationFieldsData = geoLocationFieldsData;
        this.addressFieldsData = addressFieldsData;
        if(this.hasDataLoaded.storedData) {
            this.triggerRerender = true;
        }
    }

    /**
     * Setup notes form the loaded data
     */
    setupNotesFromData() {
        if(this.locations) {
            if(typeof(this.locations) === "string") {
                this.locations = JSON.parse(this.locations);
            }
            for(let id in this.locations) {
                if(id === null || this.locations[id] === null) {
                    continue;
                }
                this.currentMaxId = Math.max(parseInt(id),this.currentMaxId);
                this.dirtyNotesId.add(id);
                let fieldLabel = this.locations[id].fieldName;
                if(!(this.locations[id].fieldName && this.locations[id].fieldName !== '')) {
                    fieldLabel = "Note Label";
                }
                this.notes.push({
                    id: id,
                    top: this.locations[id].top,
                    left: this.locations[id].left,
                    isDirty: true,
                    fieldName: this.locations[id].fieldName,
                    comment: this.locations[id].comment,
                    isDragToggleEnabled :false,
                    isDragEnabled : false,
                });
            }
        }
        this.refillNotes();
    }

    /**
     * Update the notes value to the record/localStorage as required
     */
    handleUpdateRecord(record) {
        if(this.storagetype === "Record") {
            if(!this.noteRecordId) {
                this.handleCreateRecord();
            } else {
                updateRecord(record)
                    .then(() => {
                    })
                    .catch(error => {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Error on data save',
                                message: error.message.body,
                                variant: 'error',
                            }),
                        );
                    });
                }
        }
    }

    /*
    *         -----------------------------------------------------------Event Handlers --------------------------------------------------------
    */
     
    handleMouseDown(e) {
        let triggeredNoteElem = this.getMainElementFormTarget(e);
        let noteIndex = this.getNoteIndexFromId(triggeredNoteElem);
        if(this.notes[noteIndex].isDragToggleEnabled) {
            e.preventDefault();
            // get the mouse cursor position at startup:
            this.pos3 = e.clientX;
            this.pos4 = e.clientY;
            let noteIndex = this.getNoteIndexFromId(triggeredNoteElem);
            this.notes[noteIndex].isDragEnabled = true;
            this.isDragEnabled = true;
            triggeredNoteElem.classList.add("noteDuringDrag")
        } else {
            this.isDragEnabled = false;
            this.handlecloseDragElement(e);
        }
      }

    handlecloseDragElement(e) {
        let triggeredNoteElem = this.getMainElementFormTarget(e);
        if(triggeredNoteElem.classList.contains("noteDuringDrag")) {
            triggeredNoteElem.classList.remove("noteDuringDrag")
        }
        let noteIndex = this.getNoteIndexFromId(triggeredNoteElem);
        this.notes[noteIndex].isDragEnabled = false;
        this.isDragEnabled = false;
    }

    handleelementDrag(e) {
        let triggeredNoteElem = this.getMainElementFormTarget(e);
        let noteIndex = this.getNoteIndexFromId(triggeredNoteElem);
        if(this.notes[noteIndex].isDragEnabled) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            this.pos1 = this.pos3 - e.clientX;
            this.pos2 = this.pos4 - e.clientY;
            this.pos3 = e.clientX;
            this.pos4 = e.clientY;
            // set the element's new position:
            this.noteSelected.style.top = (this.noteSelected.offsetTop - this.pos2) + "px";
            this.noteSelected.style.left = (this.noteSelected.offsetLeft - this.pos1) + "px";
        }
    }

    handleGlobalMouseMove(e) {
        if(this.isDragEnabled) {
            e.preventDefault();
            // calculate the new cursor position:
            this.pos1 = this.pos3 - e.clientX;
            this.pos2 = this.pos4 - e.clientY;
            this.pos3 = e.clientX;
            this.pos4 = e.clientY;
            // set the element's new position:
            this.noteSelected.style.top = (this.noteSelected.offsetTop - this.pos2) + "px";
            this.noteSelected.style.left = (this.noteSelected.offsetLeft - this.pos1) + "px";
        }
    }

    hanldeShowNotesToggle() {
        this.shouldDisplayNotes = !this.shouldDisplayNotes;
    }

    hanldeDeleteNote(e) {
        let elem = this.getMainElementFormTarget(e);   
        let id = elem.dataset.notenumber;   
        this.deleteNote(id);
        this.handleSaveChangesAfterDelete();
        this.refillNotes();    
    }

    handleNoteTextAreaChange(event) {
        debugger;
        event.stopPropagation();
        let elem = this.getMainElementFormTarget(event);
        let noteIndex = this.getNoteIndexFromId(elem);
        this.notes[noteIndex].top = this.noteSelected.style.top;
        this.notes[noteIndex].left = this.noteSelected.style.left;
        this.notes[noteIndex].comment = event.target.value;
        this.saveCurrentChanges(elem.dataset.notenumber, false);
    }

    handleNoteLabelChange(event) {
        event.stopPropagation();
        let elem = this.getMainElementFormTarget(event)
        let noteIndex = this.getNoteIndexFromId(elem);
        this.notes[noteIndex].top = this.noteSelected.style.top;
        this.notes[noteIndex].left = this.noteSelected.style.left;
        this.notes[noteIndex].fieldName = event.target.value;
        this.saveCurrentChanges(elem.dataset.notenumber, false);
    }

    handleCreateReminder() {
        let clockComponent = this.getClockComponent();
        let currentClockData;
        if(clockComponent) {
            this.openModal = true;
            this.showCreateReminderPicklist = true;
            currentClockData = clockComponent.getCurrentClockData();
            this.currentTimezonestOptions = [];
            for (let clock in currentClockData) {
                this.currentTimezonestOptions.push({
                    label : currentClockData[clock].timeZone,
                    value : currentClockData[clock].timeZone
                });
            }
        }
    }

    handleSelectTimezoneForReminder(e) {
        this.currentSelectedTimezoneValue = e.detail.value;
    }

    handleModalClose() {
        this.resetReminderSelections();
    }


    handleModalSave() {
        this.handleCreateTask();
        this.resetReminderSelections();
    }

    handleDateTimeValueChange(e) {
        this.selectedReminderDateTime = e.detail.value;
    }

    handleClockDataChange(event) {
        this.storedClockData = event.detail;
        if(this.storedClockData) {
            let clockData = JSON.stringify(this.storedClockData);
            if(this.storagetype === "Device") {
                this.setClockData(clockData);
            } else {
                let record = {
                    fields: {
                        Id: this.noteRecordId,
                        Name : this.recordId,
                        recUtility360__clockdata__c : clockData,
                    },
                };
                this.handleUpdateRecord(record);
            }
        }
    }

    handleRowAction(event) { 
        let id  = event.detail.row.id;
        let noteElem  = this.template.querySelector(`div.container[data-notenumber="` + id + `"]`);
        if(noteElem) {
            if(noteElem.classList.contains("container")) {
                noteElem.classList.remove("container");
            } 
            if(!noteElem.classList.contains("container-inducedhover")) {
                noteElem.classList.add("container-inducedhover");
            }
            let innerHeight = window.innerHeight;
            let scrollAmount = parseInt(this.locations[id].top.replace("px",'')) - (innerHeight/2) + 50 - window.scrollY;
            window.scrollBy(0,scrollAmount);
            noteElem.focus();
        }
    }

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

    handleFocusOut(event) {
        let noteElements = this.template.querySelectorAll("div.container-inducedhover");
        for(let note of noteElements) {
            if(note.classList.contains("container-inducedhover")) {
                note.classList.remove("container-inducedhover");
                note.classList.add("container")
            }
        }
    }

    handleAddNewNote() {
        let noteContainer = this.template.querySelector("article.notearticle");
        if(noteContainer) {
            let noteElem  = noteContainer.querySelector("div.container");
            if(this.addNoteLabel === "New Note") {
                if(!noteContainer.classList.contains("articleheight")) {
                    noteContainer.classList.add("articleheight");
                }                
                this.addNoteLabel = "Cancel";
                this.addNoteIconNme = "utility:close";
                if(!noteElem.classList.contains("container-inducedhover")) {
                    noteElem.classList.add("container-inducedhover");
                }
            } else {
                if(noteContainer.classList.contains("articleheight")) {
                    noteContainer.classList.remove("articleheight");
                }
                this.addNoteLabel = "New Note";
                this.addNoteIconNme = "utility:add";
                if(noteElem.classList.contains("container-inducedhover")) {
                    noteElem.classList.remove("container-inducedhover");
                }
           }   
        }
    }

    handleDeleteNotes() {
        let table = this.template.querySelector("lightning-datatable");
        for(let row of table.getSelectedRows()) {
            let id = row.id;
            this.deleteNote(id);
        }
        this.handleSaveChangesAfterDelete();
        this.refillNotes(); 
    }

    /*
    *  ----------------------------------------------------------------- Control Logic -------------------------------------------------------------
    */

    /**
     * Activate the edit mode for a note
     */
    toggleDragMode(e) {
        this.noteSelected = this.getMainElementFormTarget(e);
        if(this.noteSelected) {
            if(this.noteSelected.dataset.dirtystate === "false")  {
                // if(this.noteSelected.classList.contains("basenote")) {
                //     this.noteSelected.classList.remove("basenote");
                // }
                let noteContainerElem  = this.noteSelected.querySelector("div.container");
                if(noteContainerElem) {
                    if(noteContainerElem.classList.contains("container-inducedhover")) {
                        noteContainerElem.classList.remove("container-inducedhover");
                    }
                    if(!noteContainerElem.classList.contains("container")) {
                        noteContainerElem.classList.add("container");
                    }
                }
            }
        }
        let noteIndex = this.getNoteIndexFromId(this.noteSelected);
        this.notes[noteIndex].isDirty = true;
        if(this.isDragToggleEnabled && this.currentSelectedNoteId !== this.noteSelected.dataset.notenumber ) {
            for (let i in this.notes)  {
                if(this.currentSelectedNoteId === this.notes[i].id) {
                    this.notes[i].isDragToggleEnabled = false;
                    this.notes[i].isDragEnabled = false;
                }
            }        
        }
        
        if(this.notes[noteIndex].isDragToggleEnabled) {
            this.notes[noteIndex].isDragToggleEnabled = false;
            this.saveCurrentChanges(this.noteSelected.dataset.notenumber, true);
            this.refillNotes();
            this.currentSelectedNoteId = null;
            this.isDragToggleEnabled = false;
            this.noteSelected = null;
            window.onmousemove = null;
            this.isDragEnabled = false;
        } else {
            this.notes[noteIndex].isDragToggleEnabled = true;
            this.currentSelectedNoteId = this.noteSelected.dataset.notenumber;
            this.isDragToggleEnabled = true;
            window.onmousemove = this.handleGlobalMouseMove.bind(this);
        } 

    }

    /**
     * Save change to an edited note
     */
    saveCurrentChanges(selectedId , shouldUpdateStorage) {
        if(!this.locations) {
            this.locations = {};
        }
        let noteIndex = this.getNoteIndexFromId(this.noteSelected);
        if(this.locations.hasOwnProperty(selectedId) && this.locations[selectedId]) {
            this.locations[selectedId].top = this.noteSelected.style.top;
            this.locations[selectedId].left = this.noteSelected.style.left;
            this.locations[selectedId].isDirty = true;
            this.locations[selectedId].comment = this.notes[noteIndex].comment;
            this.locations[selectedId].fieldName = this.notes[noteIndex].fieldName;
        } else {
            let id = selectedId;
            this.locations[id] = {
                left : this.noteSelected.style.left,
                top : this.noteSelected.style.top,
                isDirty : true,
                comment : this.notes[noteIndex].comment,
                fieldName : this.notes[noteIndex].fieldName, 
            };
        }
        this.dirtyNotesId.add(selectedId);
        let locations = JSON.stringify(this.locations);
        if(shouldUpdateStorage) {
            if(this.storagetype === "Device") {
                localStorage.setItem("noteLocationsOf" + this.recordId, locations);
            } else {
                if(!this.noteRecordId) {
                    this.handleCreateRecord();
                }
                let record = {
                    fields: {
                        Id: this.noteRecordId,
                        Name : this.recordId,
                        recUtility360__note_data__c : locations,
                    },
                };
                this.handleUpdateRecord(record);
            }
        }
    }

    /**
     * Add notes to the base as and when required
     */
    refillNotes() {
        if(this.dirtyNotesId.size + 1 !== this.notes.length) {
            this.dataTableData = JSON.parse(JSON.stringify(this.notes));
            this.notes.splice(0, 0,         {
                id: this.currentMaxId + 1 + '',
                top: null,
                left: null,
                isDirty: false,
                fieldName: "Note Label",
                comment: "A note in time saves nine!",
                isDragToggleEnabled : false,
                isDragEnabled : false,
            });
        this.currentMaxId += 1
        }
    }

    /**
     * Get the main div element for the event target
     */
    getMainElementFormTarget(e) {
        let elem;
        if(e.target.classList.contains("mydiv")) {
            elem = e.target;
        } else {
            elem = e.target.closest("div.mydiv");
        }  
        return elem;
    }


    /**
     * Delete note from id
     */
    deleteNote(id) {
        if(this.locations.hasOwnProperty(id)) {
            delete this.locations[id];
        }
        this.dirtyNotesId.delete(id);

        for(let i in this.notes) {
            if(this.notes[i].id === id) {
                this.notes.splice(i,1)
                break;
            }
        }
    }

    handleSaveChangesAfterDelete() {
        let locations = JSON.stringify(this.locations);

        if(this.storagetype === "Device") {
            localStorage.setItem("noteLocationsOf" + this.recordId, locations);
        } else {
            let record = {
                fields: {
                    Id: this.noteRecordId,
                    Name : this.recordId,
                    recUtility360__note_data__c : locations,
                },
            };
            this.handleUpdateRecord(record);
        }
    }

    handleCreateRecord() {
        if(!this.noteRecordId) {
            const fields = {};
            fields["recUtility360__note_data__c"] = JSON.stringify(this.locations);
            fields["recUtility360__clockdata__c"] = JSON.stringify(this.storedClockData);
            fields["Name"] = this.recordId;
            const recordInput = { apiName: "recUtility360__UtilityNote__c", fields };

            createRecord(recordInput)
                .then((record) => {
                    this.noteRecordId = record.id;
                })
                .catch(error => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error creating record',
                            message: '',
                            variant: 'error'
                        })
                    );
               });
        }
    }

    getClockComponent() {
        try {
            if(this.template.shadowRoot) {
                return this.template.shadowRoot.querySelector('c-clock-component');
            } else {
                return this.template.querySelector('c-clock-component');
            }
        } catch (error) {
            return null;
        }
    }

    handleCreateTask() {
        let currentRecordUrl = window.location.href;
        let noteIndex = 0;
        for (let i in this.notes)  {
            if(this.currentSelectedNoteId === this.notes[i].id) {
                noteIndex = i;
                break;
            }
        }
        let taskName = this.notes[noteIndex].fieldName;
        // let taskDescription = this.notes[this.currentSelectedNoteId].comment;
        createTask({recordUrl : currentRecordUrl, dateTimeReminder: this.selectedReminderDateTime, timeZoneIdString: this.currentSelectedTimezoneValue, subject: taskName}).then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Task Created',
                    variant: 'success'
                })
            );
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating Task',
                    message: 'Verify you have enabled all the requirements for tasks to be enabled for this entity',
                    variant: 'error'
                })
            );
        })
    }

    resetReminderSelections() {
        this.currentSelectedTimezoneValue = "Local Timezone";
        this.openModal = false;
        this.showCreateReminderPicklist = false;
        this.currentTimezonestOptions = [];
        this.selectedReminderDateTime = '';
    }
    
    setClockData(data) {
        localStorage.setItem("clockDataOf" + this.recordId, data);
    }


    getNoteIndexFromId(triggeredNoteElem) {
        for (let i in this.notes)  {
            if(triggeredNoteElem.dataset.notenumber === this.notes[i].id) {
                return i;
            }
        }
    }

}