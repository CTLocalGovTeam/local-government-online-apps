/*global define,dojo,js,window,touchScroll,Modernizr,navigator,esri,alert,setTimeout,clearTimeout,input:true */
/*jslint sloppy:true,white:true,nomen:true,vars:true,plusplus:true */
/*
| Copyright 2012 Esri
|
| Licensed under the Apache License, Version 2.0 (the "License");
| you may not use this file except in compliance with the License.
| You may obtain a copy of the License at
|
|    http://www.apache.org/licenses/LICENSE-2.0
|
| Unless required by applicable law or agreed to in writing, software
| distributed under the License is distributed on an "AS IS" BASIS,
| WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
| See the License for the specific language governing permissions and
| limitations under the License.
*/
define("js/lgonlineEditing", ["dojo/dom-construct", "dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-class", "dojo/_base/array", "esri/dijit/editing/TemplatePicker", "esri/dijit/editing/Editor", "dojo/dom-geometry", "dojo/_base/lang", "dojo/query", "dojo/string", "esri/geometry/Extent", "dojo/aspect", "js/lgonlineBase", "js/lgonlineMap"], function (domConstruct, dom, on, domStyle, domClass, array, TemplatePicker, Editor, domGeom, lang, query, string, Extent, aspect) {

    //========================================================================================================================//
    dojo.declare("js.LGFloorNavigator", [js.LGDropdownBox, js.LGMapDependency], {
        /**
        * Constructs an LGFloorNavigator.
        *
        * @param {string} args.rootId Id for root div of created object
        * @constructor
        * @class
        * @name js.LGFloorNavigator
        * @extends js.LGDropdownBox,js.LGMapDependency
        * @classdesc
        * Provides the functionality to filter the layer(s)
        */
        constructor: function () {
            var labelDiv, label, navigatorfloorBox, navigatorTable, navigatorBody, trBody,
             tdFloorBody, selectFloorImg, mainDiv;
            mainDiv = domConstruct.create("div", {}, this.rootId);
            labelDiv = domConstruct.create("div", { className: this.labelDiv }, mainDiv);
            label = domConstruct.create("label", { innerHTML: this.checkForSubstitution(this.showPrompt), className: this.label }, labelDiv);
            navigatorfloorBox = domConstruct.create("div", {}, mainDiv);
            this.applyThemeAltBkgd(false, navigatorfloorBox);
            this.applyTheme(false, labelDiv);
            navigatorTable = domConstruct.create("table", { className: this.navigatorTable }, navigatorfloorBox);
            navigatorBody = domConstruct.create("tbody", { className: this.navigatorBodyClass }, navigatorTable);
            trBody = domConstruct.create("tr", {}, navigatorBody);
            tdFloorBody = domConstruct.create("td", {}, trBody);
            input = domConstruct.create("input", { className: this.inputBox, value: this.Defaultfloor }, tdFloorBody);
            selectFloorImg = domConstruct.create("img", { src: this.searchButtonImage, className: this.searchButton }, tdFloorBody);
            selectFloorImg.onclick = function () {
                this.onFloorFieldValueChange(this);
            };
            on(input, "change", lang.hitch(this, function () {
                this.onFloorFieldValueChange(this);
            }));
        },

        /**
        * Loop through the layers array on which definition expression is applied and call setLayerDefinitionExpression with the new value.
        * @param {object} reference of the current widget
        * @memberOf js.LGFloorNavigator#
        */
        onFloorFieldValueChange: function (pThis) {
            var newValue, message, field;
            pThis.mapObj.mapInfo.map.infoWindow.hide();
            newValue = input.value.trim();
            array.forEach(pThis.layers, function (layer) {
                pThis.setLayerDefinitionExpression(layer.layerObject, layer.floorFieldType, newValue);
                layer.layerObject.clearSelection();
                for (field = 0; field < layer.layerObject.fields.length; field++) {
                    if (layer.layerObject.fields[field].name === pThis.FloorField) {
                        if ((input.value.trim().length > layer.layerObject.fields[field].length)) {
                            message = pThis.checkForSubstitution("@messages.invalidValue");
                            alert(string.substitute(message, [layer.layerObject.fields[field].length]));
                        }
                        else if (input.value.trim().length === 0) {
                            input.value = pThis.checkForSubstitution("@prompts.nullFloorValue");
                        }
                    }
                }
            });
        },

        /**
        * Performs class-specific setup when the dependency is
        * satisfied.
        * @memberOf js.LGFloorNavigator#
        * @override
        */
        onDependencyReady: function () {
            var pThis, layerAndDefExpObject, response, field;
            pThis = this;
            pThis.layers = [];
            response = pThis.mapObj;
            dojo.connect(pThis.mapObj.mapInfo.map.infoWindow, "onShow", function () {
                pThis.infoWindowCenter(pThis);
                query(".appTheme", dom.byId("templatePicker")).forEach(function (node) {
                    node.className = "";
                });
            });
            on(pThis.mapObj.mapInfo.map, "resize", function () {
                if (pThis.mapObj.mapInfo.map.infoWindow.isShowing) {
                    setTimeout(function () {
                        pThis.infoWindowCenter(pThis);
                    }, 500);
                }
            });
            layerAndDefExpObject = { layerObject: null, floorFieldType: null };
            array.forEach(response.mapInfo.itemInfo.itemData.operationalLayers, lang.hitch(this, function (mapLayer) {
                if (mapLayer.layerObject) {
                    if (mapLayer.layerObject.type === "Feature Layer") {
                        for (field = 0; mapLayer.layerObject.fields.length; field++) {
                            if (mapLayer.layerObject.fields[field].name === pThis.FloorField) {
                                if (mapLayer.layerObject.fields[field].type === "esriFieldTypeString") {
                                    this.setLayerDefinitionExpression(mapLayer.layerObject, "esriFieldTypeString", input.value);
                                    layerAndDefExpObject.layerObject = mapLayer.layerObject;
                                    layerAndDefExpObject.floorFieldType = "esriFieldTypeString";
                                    pThis.layers.push(layerAndDefExpObject);
                                }
                                else if (mapLayer.layerObject.fields[field].type === "esriFieldTypeInteger") {
                                    this.setLayerDefinitionExpression(mapLayer.layerObject, "esriFieldTypeInteger", input.value);
                                    layerAndDefExpObject.layerObject = mapLayer.layerObject;
                                    layerAndDefExpObject.floorFieldType = "esriFieldTypeInteger";
                                    pThis.layers.push(layerAndDefExpObject);
                                }
                                break;
                            }
                        }
                    }
                }
            }));
        },

        /**
        * Centers the infowindow
        * @memberOf js.LGFloorNavigator#
        * @param {object} pThis reference of the current widget
        * @override
        */
        infoWindowCenter: function (pThis) {
            var cords, xmin, ymin, xmax, ymax, extent;
            cords = domGeom.position(dom.byId(pThis.rootId));
            if (cords.h <= 0) {
                cords = domGeom.position(dom.byId("diagMessageBox"));
            }
            xmin = pThis.mapObj.mapInfo.map.infoWindow._location.x;
            ymin = pThis.mapObj.mapInfo.map.infoWindow._location.y;
            if (cords.h > 0) {
                xmax = (pThis.mapObj.mapInfo.map.infoWindow._location.x);
            }
            else {
                xmax = pThis.mapObj.mapInfo.map.infoWindow._location.x;
            }
            ymax = pThis.mapObj.mapInfo.map.infoWindow._location.y;
            extent = new Extent(xmin, ymin, xmax, ymax, pThis.mapObj.mapInfo.map.spatialReference);
            pThis.mapObj.mapInfo.map.setExtent(extent);
            setTimeout(function () {
                pThis.mapObj.mapInfo.map.infoWindow.reposition();
            }, 500);
        },

        /**
        * Filters the layer based on the definition expression
        * @memberOf js.LGFloorNavigator#
        * @param {object} layer layer to be filtered
        * @param {string|integer} floorFieldType Type of the floor feild
        * @param {string} spinnerValue value for which the layer has to be filtered
        */
        setLayerDefinitionExpression: function (layer, floorFieldType, spinnerValue) {
            var defExpression = "";
            if (floorFieldType === "esriFieldTypeString") {
                defExpression = this.FloorField + "='" + spinnerValue + "'";
                layer.setDefinitionExpression(defExpression);
            }
            else if (floorFieldType === "esriFieldTypeInteger") {
                defExpression = this.FloorField + "=" + spinnerValue;
                layer.setDefinitionExpression(defExpression);
            }
        },

        /**
        * Functions class is been added and removed because touchScroll in ipad was not working
        * @memberOf js.LGFloorNavigator#
        */
        toggleVisibility: function () {
            query(".tempClass").forEach(function (node) {
                domClass.remove(node, "tempClass");
            });
            domStyle.set(this.getRootDiv(), "display", this.getIsVisible() ? "none" : "block");
            domClass.add(this.getRootDiv(), "tempClass");
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGEditFeature", [js.LGDropdownBox, js.LGMapDependency], {
        /**
        * Constructs an LGEditFeature.
        *
        * @param {string} args.rootId Id for root div of created object
        * @param {string} [args.rootClass] Name of CSS class to
        *        use for the root container of the object; if omitted,
        *        the div's style is set to "display:none"
        * @constructor
        * @class
        * @name js.LGFloorNavigator
        * @extends js.LGDropdownBox,js.LGMapDependency
        * @classdesc
        * Provides the functionaility to perform editing tasks on the layer(s)
        */
        constructor: function () {

            var pThis, labelDiv, label;
            pThis = this;
            dom.byId(this.rootId).className = this.rootClass;
            labelDiv = domConstruct.create("div",
                            { className: this.labelDiv }, this.rootId);
            label = domConstruct.create("label",
                            { innerHTML: this.checkForSubstitution(this.showPrompt), className: this.label }, labelDiv);
            this.templatePickerDivBox = domConstruct.create("div",
                            { className: this.templatePickerDivBoxClass }, this.rootId);
            pThis.applyTheme(false, labelDiv);
            pThis.applyThemeAltBkgd(false, this.templatePickerDivBox);
            this.templatePickerDiv = domConstruct.create("div",
                {}, this.templatePickerDivBox);
            pThis.layers = [];
            pThis.layerInfos = [];
        },

        /**
        * Performs class-specific setup when the dependency is
        * satisfied.
        * @param {object} [args.parentDiv] Name of DOM
        *        object into which the object's div is to be placed;
        *        required for subsequent searching for this object by
        *        id
        * @param {string} args.rootId Id for root div of created object
        * @memberOf js.LGEditFeature#
        * @override
        */
        onDependencyReady: function () {
            var pThis, cords, templatePicker, feature, settings, params, myEditor;
            pThis = this;
            feature = pThis.mapObj;
            feature.mapInfo.map.infoWindow.hide();
            array.forEach(feature.mapInfo.itemInfo.itemData.operationalLayers, function (mapLayer) {
                if (mapLayer.layerObject) {
                    if (mapLayer.layerObject.isEditable()) {
                        pThis.layerInfos.push({
                            "featureLayer": mapLayer.layerObject
                        });
                        pThis.layers.push(mapLayer.layerObject);
                    }
                }
            });
            this.templatePickerDivBox.parentElement.style.display = "block";
            if (pThis.layers.length === 0) {
                dom.byId(pThis.rootId).style.display = "none";
                domClass.add(dom.byId(pThis.parentDiv), pThis.navigatorHeightClass);
            }
            cords = domGeom.position(pThis.mapObj.rootId);
            templatePicker = new TemplatePicker({
                featureLayers: pThis.layers,
                rows: "auto",
                columns: 1,
                id: "templatePicker",
                grouping: true
            }, this.templatePickerDiv);
            templatePicker.startup();
            templatePicker.domNode.style.height = (cords.h - 205) + "px";
            touchScroll(this.templatePickerDivBox);
            on(pThis.mapObj.mapInfo.map, "resize", function () {
                setTimeout(function () {
                    var cords = domGeom.position(pThis.parentDiv);
                    if (cords.h > 0) {
                        templatePicker.domNode.style.height = (cords.h - 145) + "px";
                    }
                }, 500);
            });
            on(templatePicker, "click", function () {
                query(".selectedItem", templatePicker.domNode).forEach(function (node) {
                    node.className = "";
                    query(".appTheme", templatePicker.domNode).forEach(function (node) {
                        node.className = "";
                    });
                    node.style.padding = "3px";
                    pThis.applyTheme(false, node);
                });
            });
            on(templatePicker, "mouseover", function () {
                query(".appTheme", templatePicker.domNode).forEach(function (node) {
                    node.className = "";
                    pThis.applyTheme(false, node);
                });
            });
            this.templatePickerDivBox.parentElement.style.display = "block";
            settings = {
                map: feature.mapInfo.map,
                templatePicker: templatePicker,
                toolbarVisible: false,
                layerInfos: pThis.layerInfos
            };
            params = { settings: settings };
            myEditor = new Editor(params, this.templatePickerDiv);
            myEditor.startup();
            aspect.before(myEditor, "_applyEdits", lang.hitch(this, function (arg1) {
                if (arg1[0].adds) {
                    this.layer = arg1[0].layer;
                    if (input.value.trim() === "") {
                        arg1[0].adds[0].attributes[pThis.FloorField] = this.checkForSubstitution("@prompts.nullFloorValue");
                    }
                    else {
                        arg1[0].adds[0].attributes[pThis.FloorField] = input.value.trim();
                    }
                }
                else if (!arg1[0].layer) {
                    arg1[0].layer = this.layer;
                }
            }));
            dom.byId(pThis.parentDiv).style.visibility = "visible";
            dom.byId(pThis.parentDiv).style.display = "none";
        },

        /**
        * Functions class is been added and removed because touchScroll in ipad was not working
        * @memberOf js.LGEditFeature#
        */
        toggleVisibility: function () {
            query(".tempClass").forEach(function (node) {
                domClass.remove(node, "tempClass");
            });
            domStyle.set(this.getRootDiv(), "display", this.getIsVisible() ? "none" : "block");
            domClass.add(this.getRootDiv(), "tempClass");
        }
    });
});



