Ext.override(Rally.ui.grid.RowActionColumn, {
    _renderGearIcon: function(value, metaData, record) {
        return '<div class="row-action-icon icon-gear"/>';
    },

    /**
     * @private
     * @param view
     * @param el
     */
    _showMenu: function(view, el) {
        var selectedRecord = view.getRecord(Ext.fly(el).parent("tr")),
            checkedRecords = view.getSelectionModel().getSelection(),
            grid = view.panel,
            defaultOptions;

        defaultOptions = {
            cls: Rally.util.Test.toBrowserTestCssClass('row-gear-menu-' + selectedRecord.getId()) + ' row-gear-menu',
            view: view,
            record: selectedRecord,
            showInlineAdd: grid.enableInlineAdd,
            owningEl: el.parentElement,
            popoverPlacement: ['bottom', 'top'],
            
            text: 'Remove',
            
            onBeforeRecordMenuCopy: function(record) {
                return grid.onBeforeRecordMenuCopy(record);
            },
            onRecordMenuCopy: function(copiedRecord, originalRecord, operation) {
                return grid.onRecordMenuCopy(copiedRecord, originalRecord, operation);
            },
            onBeforeRecordMenuEdit: function(record) {
                return grid.onBeforeRecordMenuEdit(record);
            },
            onBeforeRecordMenuDelete: function(record) {
                return grid.onBeforeRecordMenuDelete(record);
            },
            onRecordMenuDelete: function(record) {
                return grid.onRecordMenuDelete(record);
            },
            onBeforeRecordMenuRankHighest: function(record) {
                return grid.onBeforeRecordMenuRankHighest(record);
            },
            onBeforeRecordMenuRankLowest: function(record) {
                return grid.onBeforeRecordMenuRankLowest(record);
            },
            onRecordMenuRemove: function(record) {
                return grid.onRecordMenuRemove(record);
            },
            shouldRecordBeRankable: function(record) {
                return grid.shouldRecordBeRankable(record);
            },
            
            handler: function () {
                // TODO:  Decouple
                Rally.getApp().removeAssociation(this.record);
                this.onRecordMenuRemove(this.record);
            }
        };

        this.menu = Ext.create('Rally.ui.menu.RecordMenu', Ext.apply({
            items: [defaultOptions]
        }, defaultOptions));
       
        this.menu.showBy(Ext.fly(el).down(".row-action-icon"));
    }
});