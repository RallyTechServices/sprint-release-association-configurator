Ext.define("TSSprintReleaseConfigurator", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selector_box', layout: { type:'hbox'} },
        {xtype:'container',itemId:'display_box'}
    ],
    
    keyPrefix: 'rally.technicalservices.rel-to-sprint',
    savedValues: [],
    savedPreference: null,
    preferenceModel: null,
    selectedRelease: null,
    store: null,
    
    launch: function() {
        var me = this;
        Rally.data.ModelFactory.getModel({
            type: 'Preference',
            success: function(model) {
                me.preferenceModel = model;
                me._addSelectors(me.down('#selector_box'));
            }
        });
        
    },
    
    _addSelectors: function(container) {
        container.add({
            xtype:'rallyreleasecombobox',
            listeners: {
                scope: this,
                change: function(box) {
                    this._updateData(box.getRecord());
                }
            }
        });
        
        container.add({
            xtype:'rallybutton',
            text: 'Add TargetSprint(s)',
            disabled: true,
            listeners: {
                scope: this,
                click: this._launchPicker
            }
        });
    },
    
    _updateData: function(release) {
        this.logger.log("_updateData:", release);
        var me = this;
        this.setLoading("Loading...");
        
        this.selectedRelease = release;
        if ( this.store ) { this.store.destroy(); }
        
        this.savedValues = [];
        this.savedPreference = null;
        
        this.down('rallybutton') && this.down('rallybutton').setDisabled(true);
        
        this._getExistingAssociations(release).then({
            scope: this,
            success: function(results) {
                this.down('rallybutton') && this.down('rallybutton').setDisabled(false);

                this._addTable(results);
                this.logger.log('Done adding table');
            },
            failure: function(msg) {
                Ext.Msg.alert('',msg);
            }
        }).always(function() {
            me.setLoading(false);
        });
    },
    
    _getExistingAssociations: function(release) {
        var deferred = Ext.create('Deft.Deferred');
        
        var release_name = release.get('Name');
        var key = this._getKey();
        var filters = [{property:'Name', value: key}];
        var model = "Preference";
        var fields = ['Name','Value'];
        
        this._loadRecordsWithAPromise(model,fields,filters).then({
            success: function(result) {
                deferred.resolve(result);
            },
            failure: function(msg) {
                deferred.reject('',msg);
            }
        });
        
        return deferred.promise;
    },

    _addTable: function(pref) {
        var container = this.down('#display_box');
        container.removeAll();
        this.logger.log("_addTable:", pref);
        
        if ( Ext.isEmpty(pref) ) {
            container.add({xtype:'container',html:'No Associations Yet.'});
        } else {
            this.savedPreference = pref[0];

            this.store = this._updateStore();
            
            container.add({
                xtype:'rallygrid',
                store: this.store,
                showPagingToolbar: false,
                showRowActionsColumn: true,
                columnCfgs: [{dataIndex:'StringValue', text:'Associated TargetSprints', flex: 1}]
            });
        }
    },
    
    _updateStore: function() {
        var value = this.savedPreference.get('Value');
        this.logger.log('value:', value);
        
        this.savedValues = Ext.JSON.decode(value,true) || value.split(',');
        
        this.logger.log(this.savedValues);
        
        var data = Ext.Array.map(this.savedValues, function(stringvalue){
            return { StringValue: stringvalue };
        });
        
        this.logger.log("Making store with data", data);
        if ( Ext.isEmpty(this.store) ) {
            this.store = Ext.create('Rally.data.custom.Store',{
                data: data
            });
        } else {
            this.store.loadData(data);
        }
        
        return this.store;
    },
    
    removeAssociation: function(association_record) {
        var me = this;
        
        this.logger.log('Remove', association_record);
        var value = association_record.get('StringValue');
        
        var values = Ext.Array.filter(this.savedValues,function(saved_value){
            return ( saved_value != value );
        });
        
        this.savedValues = values;
        var value = Ext.JSON.encode(values);
        
        if ( !Ext.isEmpty(this.savedPreference) ) {
            // update pref
            this.logger.log("Updating pref", this.savedPreference.get('Name'));
            this.savedPreference.set('Value',value);
            this.savedPreference.save({
                callback: function(result, operation) {
                    if(operation.wasSuccessful()) {
                        me.savedPreference = result;
                        me._updateStore();
                    }
                }
            });
        }
    },
    
    _loadRecordsWithAPromise: function(model_name, model_fields,filters){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        this.logger.log("Starting load:",model_name,model_fields);
        
        Ext.create('Rally.data.wsapi.Store', {
            model: model_name,
            fetch: model_fields,
            filters: filters
        }).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    _displayGrid: function(store,field_names){
        this.down('#display_box').add({
            xtype: 'rallygrid',
            store: store,
            columnCfgs: field_names
        });
    },
    
    _launchPicker: function() {
        
        Ext.create('Rally.technicalservices.FieldValueDialog',{
            artifactType: 'PortfolioItem',
            artifactField: 'c_FeatureTargetSprint',
            listeners: {
                scope: this,
                valuechosen: function(dialog,values) {
                    this.logger.log("Selected Values: ", values);
                    var string_values = Ext.Array.map(values, function(value) {
                        return value.get('StringValue');
                    })
                    this._addToList(string_values);
                }
            }
        }).show();
    },
    
    _getKey: function() {
        if ( Ext.isEmpty(this.selectedRelease) ) {
            return null;
        }
        var release_name = this.selectedRelease.get('Name');
        return this.keyPrefix + "." + release_name;
    },
    
    _addToList: function(values) {
        var me = this;
        this.logger.log("_addToList",values);
        this.logger.log("  Existing List:", this.savedValues);
        
        var values = Ext.Array.merge(this.savedValues,values);
        
        this.savedValues = values;
        var value = Ext.JSON.encode(values);
        
        if ( !Ext.isEmpty(this.savedPreference) ) {
            // update pref
            this.logger.log("Updating pref", this.savedPreference.get('Name'));
            this.savedPreference.set('Value',value);
            this.savedPreference.save({
                callback: function(result, operation) {
                    if(operation.wasSuccessful()) {
                        me.savedPreference = result;
                        me._updateStore();
                    }
                }
            });
        } else {
            // create pref
            var key = this._getKey();
            
            this.logger.log("saving ", value, " from (", values, ")");
            
            var pref = Ext.create(this.preferenceModel,{
                Name:  key,
                Value: values,
                Workspace: this.getContext().getWorkspace()
            });
            
            pref.save({
                
                callback: function(result, operation) {
                    console.log(result,operation);
                    if(operation.wasSuccessful()) {
                        me.savedPreference = result;
                        me._addTable([result]);
                    } else {
                                                
                        if ( operation.error && operation.error.errors.length > 0 ) {
                            Ext.Msg.alert('Problem saving association', operation.error.errors.join('<br/>'));
                        }
                    }
                }
            });
        }
    },
    
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this.launch();
    }
});
