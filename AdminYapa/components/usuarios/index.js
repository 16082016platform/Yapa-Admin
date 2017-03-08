'use strict';

app.usuarios = kendo.observable({
    onShow: function () { },
    afterShow: function () { }
});
app.localization.registerView('usuarios');

// START_CUSTOM_CODE_usuarios
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_usuarios
(function (parent) {
    var dataProvider = app.data.backendServices,
        /// start global model properties

        processImage = function (img) {

            function isAbsolute(img) {
                if (img && img.match(/http:\/\/|https:\/\/|data:|\/\//g)) {
                    return true;
                }
                return false;
            }

            if (!img) {
                var empty1x1png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12NgYAAAAAMAASDVlMcAAAAASUVORK5CYII=';
                img = 'data:image/png;base64,' + empty1x1png;
            } else if (typeof img === 'string' && !isAbsolute(img)) {
                var setup = dataProvider.setup || {};
                img = setup.scheme + ':' + setup.url + setup.appId + '/Files/' + img + '/Download';
            }

            return img;
        },

        /// end global model properties
        fetchFilteredData = function (paramFilter, searchFilter) {
            var model = parent.get('usuariosModel'),
                dataSource;

            if (model) {
                dataSource = model.get('dataSource');
            } else {
                parent.set('usuariosModel_delayedFetch', paramFilter || null);
                return;
            }

            if (paramFilter) {
                model.set('paramFilter', paramFilter);
            } else {
                model.set('paramFilter', undefined);
            }

            if (paramFilter && searchFilter) {
                dataSource.filter({
                    logic: 'and',
                    filters: [paramFilter, searchFilter]
                });
            } else if (paramFilter || searchFilter) {
                dataSource.filter(paramFilter || searchFilter);
            } else {
                dataSource.filter({});
            }
        },

        flattenLocationProperties = function (dataItem) {
            var propName, propValue,
                isLocation = function (value) {
                    return propValue && typeof propValue === 'object' &&
                        propValue.longitude && propValue.latitude;
                };

            for (propName in dataItem) {
                if (dataItem.hasOwnProperty(propName)) {
                    propValue = dataItem[propName];
                    if (isLocation(propValue)) {
                        dataItem[propName] =
                            kendo.format('Latitude: {0}, Longitude: {1}',
                                propValue.latitude, propValue.longitude);
                    }
                }
            }
        },
        dataSourceOptions = {
            type: 'everlive',
            transport: {
                typeName: 'Users',
                dataProvider: dataProvider
            },
            change: function (e) {
                var data = this.data();
                var total = 0;
                for (var i = 0; i < data.length; i++) {
                    var dataItem = data[i];

                    dataItem['DisplayNameUrl'] =
                        processImage(dataItem['DisplayName']);

                    dataItem['CreatedAt'] = kendo.toString(new Date(dataItem['CreatedAt']), "dddd dd/MM/yyyy  hh:mm tt");

                    total = data.length;

                    dataItem['total'] = total;

                    dataItem['observacion'] = (dataItem['observacion'] ? dataItem['observacion'] : "");

                    /// start flattenLocation property
                    flattenLocationProperties(dataItem);
                    /// end flattenLocation property

                }

                $("#cantidadRegistros").text("Cantidad de usuarios: " + total);

            },
            error: function (e) {

                if (e.xhr) {
                    var errorText = "";
                    try {
                        errorText = JSON.stringify(e.xhr);
                    } catch (jsonErr) {
                        errorText = e.xhr.responseText || e.xhr.statusText || 'An error has occurred!';
                    }
                    alert(errorText);
                }
            },
            schema: {
                model: {
                    fields: {
                        'DisplayName': {
                            field: 'DisplayName',
                            defaultValue: '',
                            type: "string"
                        },
                        'Username': {
                            field: 'Username',
                            defaultValue: '',
                            type: "string"
                        },
                        'Email': {
                            field: 'Email',
                            defaultValue: '',
                            type: "string"
                        },
                        'CreatedAt': {
                            field: 'CreatedAt',
                            defaultValue: '',
                            type: "date"
                        },
                        'observacion': {
                            field: 'observacion',
                            defaultValue: '',
                            type: "string"
                        },
                        'estado': {
                            field: 'estado',
                            defaultValue: '',
                            type: "string"
                        }
                    },
                    icon: function () {
                        var i = 'globe';
                        return kendo.format('km-icon km-{0}', i);
                    }
                }
            },
            serverFiltering: true,
            serverSorting: true,
            sort: {
                field: 'CreatedAt',
                dir: 'asc'
            },
            serverPaging: true,
            pageSize: 50
        },
        /// start data sources
        /// end data sources
        usuariosModel = kendo.observable({
            _dataSourceOptions: dataSourceOptions,
            searchChange: function (e) {
                var searchVal = e.target.value,
                    searchFilter;

                if (searchVal) {
                    searchFilter = {
                        field: 'Username',
                        operator: 'contains',
                        value: searchVal
                    };
                }
                fetchFilteredData(usuariosModel.get('paramFilter'), searchFilter);
            },
            fixHierarchicalData: function (data) {
                var result = {},
                    layout = {};

                $.extend(true, result, data);

                (function removeNulls(obj) {
                    var i, name,
                        names = Object.getOwnPropertyNames(obj);

                    for (i = 0; i < names.length; i++) {
                        name = names[i];

                        if (obj[name] === null) {
                            delete obj[name];
                        } else if ($.type(obj[name]) === 'object') {
                            removeNulls(obj[name]);
                        }
                    }
                })(result);

                (function fix(source, layout) {
                    var i, j, name, srcObj, ltObj, type,
                        names = Object.getOwnPropertyNames(layout);

                    if ($.type(source) !== 'object') {
                        return;
                    }

                    for (i = 0; i < names.length; i++) {
                        name = names[i];
                        srcObj = source[name];
                        ltObj = layout[name];
                        type = $.type(srcObj);

                        if (type === 'undefined' || type === 'null') {
                            source[name] = ltObj;
                        } else {
                            if (srcObj.length > 0) {
                                for (j = 0; j < srcObj.length; j++) {
                                    fix(srcObj[j], ltObj[0]);
                                }
                            } else {
                                fix(srcObj, ltObj);
                            }
                        }
                    }
                })(result, layout);

                return result;
            },
            itemClick: function (e) {
                var dataItem = e.dataItem || usuariosModel.originalItem;

                app.mobileApp.navigate('#components/usuarios/details.html?uid=' + dataItem.uid);

            },
            generarExcel: function (e) {
                // var excelFileContent = e.workbook.toDataURL();

                // write excelFileContent to a file
                //.....

                var rows = [{
                    cells: [
                        { value: "DNI" },
                        { value: "TELEFONO" },
                        { value: "CORREO" },
                        { value: "FECHA DE REGISTRO" },
                        { value: "OBSERVACION" },
                        { value: "ESTADO" }
                    ]
                }];

                //using fetch, so we can process the data when the request is successfully completed
                usuariosModel.get('dataSource').fetch(function () {
                    var data = this.data();
                    for (var i = 0; i < data.length; i++) {
                        //push single row for every record
                        rows.push({
                            cells: [
                                { value: data[i].Username },
                                { value: data[i].DisplayName },
                                { value: data[i].Email },
                                { value: data[i].CreatedAt },
                                { value: data[i].observacion },
                                { value: data[i].estado }
                            ]
                        })
                    }
                    var workbook = new kendo.ooxml.Workbook({
                        sheets: [
                            {
                                columns: [
                                    // Column settings (width)
                                    { autoWidth: true },
                                    { autoWidth: true },
                                    { autoWidth: true },
                                    { autoWidth: true },
                                    { autoWidth: true }
                                ],
                                // Title of the sheet
                                title: "Usuarios",
                                // Rows of the sheet
                                rows: rows
                            }
                        ]
                    });
                    //save the file as Excel file with extension xlsx
                    kendo.saveAs({ dataURI: workbook.toDataURL(), fileName: "Reporte.xlsx" });

                });


                // e.preventDefault();

            },
            editClick: function () {
                var uid = this.originalItem.uid;
                app.mobileApp.navigate('#components/usuarios/edit.html?uid=' + uid);
            },
            detailsShow: function (e) {
                var uid = e.view.params.uid,
                    dataSource = usuariosModel.get('dataSource'),
                    itemModel = dataSource.getByUid(uid);

                usuariosModel.setCurrentItemByUid(uid);

                /// start detail form show
                /// end detail form show
            },
            setCurrentItemByUid: function (uid) {
                var item = uid,
                    dataSource = usuariosModel.get('dataSource'),
                    itemModel = dataSource.getByUid(item);
                itemModel.DisplayNameUrl = processImage(itemModel.DisplayName);

                if (!itemModel.DisplayName) {
                    itemModel.DisplayName = String.fromCharCode(160);
                }

                /// start detail form initialization
                /// end detail form initialization

                usuariosModel.set('originalItem', itemModel);
                usuariosModel.set('currentItem',
                    usuariosModel.fixHierarchicalData(itemModel));

                return itemModel;
            },
            linkBind: function (linkString) {
                var linkChunks = linkString.split('|');
                if (linkChunks[0].length === 0) {
                    return this.get('currentItem.' + linkChunks[1]);
                }
                return linkChunks[0] + this.get('currentItem.' + linkChunks[1]);
            },
            /// start masterDetails view model functions
            /// end masterDetails view model functions
            currentItem: {}
        });

    parent.set('editItemViewModel', kendo.observable({
        /// start edit model properties
        /// end edit model properties
        /// start edit model functions
        /// end edit model functions
        editFormData: {},
        onShow: function (e) {
            var that = this,
                itemUid = e.view.params.uid,
                dataSource = usuariosModel.get('dataSource'),
                itemData = dataSource.getByUid(itemUid),
                fixedData = usuariosModel.fixHierarchicalData(itemData);

            /// start edit form before itemData
            /// end edit form before itemData

            this.set('itemData', itemData);
            this.set('editFormData', {
                observacion: itemData.observacion,
                estado: itemData.estado,
                /// start edit form data init
                /// end edit form data init
            });

            /// start edit form show
            /// end edit form show
        },
        linkBind: function (linkString) {
            var linkChunks = linkString.split(':');
            return linkChunks[0] + ':' + this.get('itemData.' + linkChunks[1]);
        },
        onSaveClick: function (e) {
            var that = this,
                editFormData = this.get('editFormData'),
                itemData = this.get('itemData'),
                dataSource = usuariosModel.get('dataSource');

            /// edit properties
            itemData.set('observacion', editFormData.observacion);
            itemData.set('estado', editFormData.estado);
            /// start edit form data save
            /// end edit form data save

            function editModel(data) {
                /// start edit form data prepare
                /// end edit form data prepare
                dataSource.one('sync', function (e) {
                    /// start edit form data save success
                    /// end edit form data save success

                    app.mobileApp.navigate('#:back');
                });

                dataSource.one('error', function () {
                    dataSource.cancelChanges(itemData);
                });

                dataSource.sync();
                app.clearFormDomData('edit-item-view');
            };
            /// start edit form save
            /// end edit form save
            /// start edit form save handler
            editModel();
            /// end edit form save handler
        },
        onCancel: function () {
            /// start edit form cancel
            /// end edit form cancel
        }
    }));

    if (typeof dataProvider.sbProviderReady === 'function') {
        dataProvider.sbProviderReady(function dl_sbProviderReady() {
            parent.set('usuariosModel', usuariosModel);
            var param = parent.get('usuariosModel_delayedFetch');
            if (typeof param !== 'undefined') {
                parent.set('usuariosModel_delayedFetch', undefined);
                fetchFilteredData(param);
            }
        });
    } else {
        parent.set('usuariosModel', usuariosModel);
    }

    parent.set('onShow', function (e) {
        var param = e.view.params.filter ? JSON.parse(e.view.params.filter) : null,
            isListmenu = false,
            backbutton = e.view.element && e.view.element.find('header [data-role="navbar"] .backButtonWrapper'),
            dataSourceOptions = usuariosModel.get('_dataSourceOptions'),
            dataSource;

        if (param || isListmenu) {
            backbutton.show();
            backbutton.css('visibility', 'visible');
        } else {
            if (e.view.element.find('header [data-role="navbar"] [data-role="button"]').length) {
                backbutton.hide();
            } else {
                backbutton.css('visibility', 'hidden');
            }
        }

        if (!usuariosModel.get('dataSource')) {
            dataSource = new kendo.data.DataSource(dataSourceOptions);
            usuariosModel.set('dataSource', dataSource);
        }

        fetchFilteredData(param);
    });

})(app.usuarios);

// START_CUSTOM_CODE_usuariosModel
// Add custom code here. For more information about custom code, see http://docs.telerik.com/platform/screenbuilder/troubleshooting/how-to-keep-custom-code-changes

// END_CUSTOM_CODE_usuariosModel


function generarExcel() {

}