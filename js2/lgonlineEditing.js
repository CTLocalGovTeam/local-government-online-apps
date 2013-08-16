/*global define,dojo,js,touchScroll,esri,alert,setTimeout */
/*jslint sloppy:true */
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
define("js/lgonlineEditing", ["dojo/dom-construct", "dojo/dom", "dojo/on", "dojo/dom-style", "dojo/dom-class", "dojo/_base/array", "esri/dijit/editing/TemplatePicker", "esri/dijit/editing/Editor", "dojo/dom-geometry", "dojo/_base/lang", "dojo/query", "dojo/string", "dijit/Tooltip", "esri/geometry/Extent", "esri/geometry/screenUtils", "dojo/aspect", "js/lgonlineBase", "js/lgonlineMap"], function (domConstruct, dom, on, domStyle, domClass, array, TemplatePicker, Editor, domGeom, lang, query, string, Tooltip, Extent, screenUtils, aspect) {

    //========================================================================================================================//
    dojo.declare("js.LGFloorNavigator", [js.LGDropdownBox, js.LGMapDependency], {
        /**
        * Constructs an LGFloorNavigator.
        *
        * @param {string} args.rootId Id for root div of created object
        * @constructor
        * @class
        * @name js.LGFloorNavigator
        * @extends js.LGDropdownBox, js.LGMapDependency
        * @classdesc
        * Provides the functionality to filter the layer(s) and perform editing tasks on the layer(s)
        */
        constructor: function () {
            var labelDiv, navigatorFloorBox, navigatorTable, navigatorBody, trBody,
                tdFloorBody, selectFloorImg, mainDiv, labelEditDiv, field, toolTip, editFeatureBox;
            mainDiv = domConstruct.create("div", {}, this.rootId);
            labelDiv = domConstruct.create("div", { className: this.labelDiv }, mainDiv);
            domConstruct.create("label",
                { innerHTML: this.checkForSubstitution(this.showPromptFloor), className: this.label }, labelDiv);
            navigatorFloorBox = domConstruct.create("div", {}, mainDiv);
            this.applyThemeAltBkgd(false, navigatorFloorBox);
            this.applyTheme(false, labelDiv);
            navigatorTable = domConstruct.create("table", { className: this.navigatorTable }, navigatorFloorBox);
            navigatorBody = domConstruct.create("tbody", { className: this.navigatorBodyClass }, navigatorTable);
            trBody = domConstruct.create("tr", {}, navigatorBody);
            tdFloorBody = domConstruct.create("td", {}, trBody);
            this.input = domConstruct.create("input", { className: this.inputBox, value: this.defaultFloor }, tdFloorBody);
            selectFloorImg = domConstruct.create("img",
                { src: this.searchButtonImage, className: this.searchButton }, tdFloorBody);
            on(selectFloorImg, "click", lang.hitch(this, function () {
                this.onFloorFieldValueChange();
            }));
            on(this.input, "change", lang.hitch(this, function () {
                this.onFloorFieldValueChange();
            }));
            on(this.input, "focus", lang.hitch(this, function () {
                array.forEach(this.layers, lang.hitch(this, function (layer) {
                    for (field = 0; field < layer.layerObject.fields.length; field += 1) {
                        if (layer.layerObject.fields[field].name === this.floorField) {
                            //set the tooltip for the input box 
                            toolTip = this.checkForSubstitution(this.inputBoxTooltip);
                            toolTip = string.substitute(toolTip, [layer.layerObject.fields[field].length]);
                            Tooltip.show(toolTip, this.input);
                            break;
                        }
                    }
                }));

            }));
            on(this.input, "blur", lang.hitch(this, function () {
                //hide the tooltip for the input box 
                Tooltip.hide(this.input);
            }));
            on(this.input, "keydown", lang.hitch(this, function () {
                //hide the tooltip for the input box
                Tooltip.hide(this.input);
            }));
            dom.byId(this.rootId).className = this.rootClass;
            editFeatureBox = domConstruct.create("div",
                { className: this.editFeatureBox }, this.rootId);
            labelEditDiv = domConstruct.create("div",
                { className: this.labelDiv }, editFeatureBox);
            domConstruct.create("label",
                { innerHTML: this.checkForSubstitution(this.showPrompt), className: this.labelClass }, labelEditDiv);
            this.templatePickerDivBox = domConstruct.create("div",
                { className: this.templatePickerDivBoxClass }, editFeatureBox);
            this.applyTheme(false, labelEditDiv);
            this.applyThemeAltBkgd(false, this.templatePickerDivBox);
            this.templatePickerDiv = domConstruct.create("div",
                {}, this.templatePickerDivBox);
            this.layers = [];
            this.layerInfos = [];
        },

        /**
        * Loops through the layers array on which definition expression is applied and calls
        * setLayerDefinitionExpression with the new value.
        * @memberOf js.LGFloorNavigator#
        */
        onFloorFieldValueChange: function () {
            var newValue, pThis = this;
            this.mapObj.mapInfo.map.infoWindow.hide();
            newValue = this.input.value.trim();
            //loop through the layers to apply the definition expression.Only the features that match the definition expression are displayed.
            array.forEach(pThis.layers, function (layer) {
                pThis.setLayerDefinitionExpression(layer.layerObject, layer.floorFieldType, newValue);
                layer.layerObject.clearSelection();
            });
        },

        /**
        * Performs class-specific setup when the dependency is
        * satisfied.
        * @memberOf js.LGFloorNavigator#
        * @override
        */
        onDependencyReady: function () {
            var pThis, layerAndDefExpObject, response, field, mapPoint, map, coords, templatePicker, feature, settings, params, myEditor;
            pThis = this;
            feature = this.mapObj;
            feature.mapInfo.map.infoWindow.hide();
            //checking for editable layers by looping all the layers and pushing them in an array
            array.forEach(feature.mapInfo.itemInfo.itemData.operationalLayers, function (mapLayer) {
                if (mapLayer.layerObject) {
                    if (mapLayer.layerObject.isEditable()) {
                        pThis.layerInfos.push({
                            "featureLayer": mapLayer.layerObject
                        });
                        pThis.layers.push(mapLayer.layerObject);
                    }
                    else {
                        dom.byId(pThis.rootId).style.bottom = "2px";
                    }
                }
            });
            this.templatePickerDivBox.parentElement.style.display = "block";
            if (pThis.layers.length === 0) {
                dom.byId(pThis.rootId).style.display = "none";
                domClass.add(dom.byId(pThis.parentDiv), pThis.navigatorHeightClass);
            }
            coords = domGeom.position(this.mapObj.rootId);
            templatePicker = new TemplatePicker({
                featureLayers: pThis.layers,
                rows: "auto",
                columns: 1,
                id: "templatePicker",
                grouping: true
            }, this.templatePickerDiv);
            templatePicker.startup();
            templatePicker.domNode.style.height = (coords.h - 187) + "px";
            touchScroll(this.templatePickerDivBox);
            //adjusting the height of template picker on map resize
            on(this.mapObj.mapInfo.map, "resize", function () {
                coords = domGeom.position(pThis.parentDiv);
                if (coords.h > 0) {
                    templatePicker.domNode.style.height = (coords.h - 145) + "px";
                }
            });
            //on click of an item in template picker, change the row background color and padding.
            on(templatePicker, "click", function () {
                query(".selectedItem", templatePicker.domNode).forEach(function (node) {
                    node.className = "";
                    query(".appTheme", templatePicker.domNode).forEach(function (node) {
                        node.className = "";
                        domClass.add(node, "dojoxGridCell");
                    });
                    node.style.padding = "3px";
                    pThis.applyTheme(false, node);

                });
            });
            //apply the theme color to the template picker row on mouse over
            on(templatePicker, "mouseover", function () {
                query(".appTheme", templatePicker.domNode).forEach(function (node) {
                    node.className = "";
                    pThis.applyTheme(false, node);
                });
            });
            this.templatePickerDivBox.parentElement.style.display = "block";
            //settings for the editor widget
            settings = {
                map: feature.mapInfo.map,
                templatePicker: templatePicker,
                toolbarVisible: false,
                layerInfos: pThis.layerInfos
            };
            params = { settings: settings };
            myEditor = new Editor(params, this.templatePickerDiv);
            myEditor.startup();
            //push the floor value in the floor field of the attribute inspector
            aspect.before(myEditor, "_applyEdits", lang.hitch(this, function (arg1) {
                if (arg1[0].adds) {
                    this.layer = arg1[0].layer;
                    //if the floor value is blank in the input, substitute floor field of the attribute inspector by a configured value.
                    if (this.input.value.trim() === "") {
                        arg1[0].adds[0].attributes[pThis.floorField] = this.checkForSubstitution("@prompts.nullFloorValue");
                    } else {
                        arg1[0].adds[0].attributes[pThis.floorField] = this.input.value.trim();
                    }
                } else if (!arg1[0].layer) {
                    arg1[0].layer = this.layer;
                }
            }));
            dom.byId(pThis.rootId).style.visibility = "visible";
            dom.byId(pThis.rootId).style.display = "none";
            map = pThis.mapObj.mapInfo.map;
            this.layers = [];
            response = pThis.mapObj;
            //Get the coordinates of info window anchor before it is shown
            aspect.before(map.infoWindow, "show", function (coords) {
                if (!coords.spatialReference) {
                    mapPoint = new screenUtils.toMapGeometry(map.extent, map.width, map.height, coords);
                } else {
                    mapPoint = coords;
                }
                pThis.x = mapPoint.x;
                pThis.y = mapPoint.y;
            });
            //center the info window whenever it is shown.
            dojo.connect(pThis.mapObj.mapInfo.map.infoWindow, "onShow", function () {
                pThis.infoWindowCenter();
                query(".appTheme", dom.byId("templatePicker")).forEach(function (node) {
                    node.className = "";
                    domClass.add(node, "dojoxGridCell");
                });
            });
            //center the info window whenever the  map is resized
            on(pThis.mapObj.mapInfo.map, "resize", function () {
                if (pThis.mapObj.mapInfo.map.infoWindow.isShowing) {
                    setTimeout(function () {
                        pThis.infoWindowCenter();
                    }, 500);
                }
            });
            //Loop through all the operation layers added to the map. If layer type is Feature layer, find if layer has floor field.
            //if all above conditions are satisfied push the field type and layer object to an array of object.
            array.forEach(response.mapInfo.itemInfo.itemData.operationalLayers, lang.hitch(this, function (mapLayer) {
                if (mapLayer.layerObject) {
                    if (mapLayer.layerObject.type === "Feature Layer") {
                        for (field = 0; field < mapLayer.layerObject.fields.length; field += 1) {
                            if (mapLayer.layerObject.fields[field].name === pThis.floorField) {
                                //set the maximum length of the input equal to the floor field's length
                                pThis.input.maxLength = mapLayer.layerObject.fields[field].length;
                                //push the field type and layer object to an array of object
                                if (mapLayer.layerObject.fields[field].type === "esriFieldTypeString") {
                                    this.setLayerDefinitionExpression(mapLayer.layerObject, "esriFieldTypeString",
                                        this.input.value);
                                    layerAndDefExpObject = {
                                        "layerObject": mapLayer.layerObject,
                                        "floorFieldType": "esriFieldTypeString"
                                    };
                                    pThis.layers.push(layerAndDefExpObject);
                                } else if (mapLayer.layerObject.fields[field].type === "esriFieldTypeInteger") {
                                    this.setLayerDefinitionExpression(mapLayer.layerObject, "esriFieldTypeInteger",
                                        this.input.value);
                                    layerAndDefExpObject = {
                                        "layerObject": mapLayer.layerObject,
                                        "floorFieldType": "esriFieldTypeInteger"
                                    };
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
        * Centers the info window
        * @memberOf js.LGFloorNavigator#
        * @override
        */
        infoWindowCenter: function () {
            var coords, xmin, ymin, xmax, ymax, extent, pThis;
            pThis = this;
            coords = domGeom.position(dom.byId(this.rootId));
            if (coords.h <= 0) {
                coords = domGeom.position(dom.byId("diagMessageBox"));
            }
            xmin = pThis.x;
            ymin = pThis.y;
            if (coords.h > 0) {
                xmax = pThis.x;
            } else {
                xmax = pThis.x;
            }
            ymax = pThis.y;
            extent = new Extent(xmin, ymin, xmax, ymax, this.mapObj.mapInfo.map.spatialReference);
            this.mapObj.mapInfo.map.setExtent(extent);
            setTimeout(function () {
                pThis.mapObj.mapInfo.map.infoWindow.reposition();
            }, 500);
        },

        /**
        * Filters the layer based on the definition expression
        * @memberOf js.LGFloorNavigator#
        * @param {object} layer to be filtered
        * @param {string|integer} floorFieldType Type of the floor field
        * @param {string} spinnerValue Value for which the layer has to be filtered
        */
        setLayerDefinitionExpression: function (layer, floorFieldType, spinnerValue) {
            var defExpression = "";
            if (floorFieldType === "esriFieldTypeString") {
                defExpression = this.floorField + "='" + spinnerValue + "'";
                layer.setDefinitionExpression(defExpression);
            } else if (floorFieldType === "esriFieldTypeInteger") {
                defExpression = this.floorField + "=" + spinnerValue;
                layer.setDefinitionExpression(defExpression);
            }
        },

        /**
        * It is observed that touch scroll does not work in iPad until some style changes when widget is reopened.
        * Hence as a safe workaround empty class is being added and removed from the widget.
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
});
