/*global define,dojo,js,window,touchScroll,Modernizr,navigator,esri,alert,setTimeout,clearTimeout */
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
//============================================================================================================================//
define("js/lgonlineCommand", ["dijit", "dojo/dom-construct", "dojo/dom", "dojo/on", "dojo/Deferred", "dojo/dom-style", "dojo/dom-class", "dojo/_base/array", "dojo/topic", "dijit/form/TextBox", "esri/dijit/BasemapGallery", "esri/tasks/PrintTask", "esri/tasks/PrintParameters", "esri/tasks/PrintTemplate", "js/lgonlineBase", "js/lgonlineMap"], function (dijit, domConstruct, dom, on, Deferred, domStyle, domClass, array, topic, TextBox, BasemapGallery, PrintTask, PrintParameters, PrintTemplate) {

    //========================================================================================================================//

    dojo.declare("js.LGDropdownBox", js.LGGraphic, {
        /**
         * Constructs an LGDropdownBox.
         *
         * @constructor
         * @class
         * @name js.LGDropdownBox
         * @extends js.LGGraphic
         * @classdesc
         * Provides a generic dropdown that toggles its visibility based
         * on a subscription to a trigger message.
         */
        constructor: function () {
            var pThis = this;

            this.applyTheme(false);

            // Start listening for activation/deactivation call
            if (this.trigger) {
                topic.subscribe("command", function (sendingTrigger) {
                    if (sendingTrigger !== pThis.trigger) {
                        pThis.setIsVisible(false);
                    }
                });
                topic.subscribe(this.trigger, function (data) {
                    pThis.handleTrigger(data);
                });
            }
        },

        /**
         * Handles a trigger by toggling visibility.
         * @param {object} [data] Data accompanying trigger.
         * @memberOf js.LGDropdownBox#
         */
        handleTrigger: function () {
            this.toggleVisibility();
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGMapBasedMenuBox", [js.LGDropdownBox, js.LGMapDependency], {
        /**
         * Constructs an LGMapBasedMenuBox.
         *
         * @constructor
         * @class
         * @name js.LGMapBasedMenuBox
         * @extends js.LGDropdownBox, js.LGMapDependency
         * @classdesc
         * Provides a UI display of a menu that is not available until
         * the specified map is available.
         */
        constructor: function () {
            this.ready = new Deferred();
        },

        /**
         * Performs class-specific setup when the dependency is
         * satisfied.
         * @memberOf js.LGMapBasedMenuBox#
         * @override
         */
        onDependencyReady: function () {
            this.ready.resolve(this);
            this.inherited(arguments);
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGBasemapBox", js.LGMapBasedMenuBox, {
        /**
         * Constructs an LGBasemapBox.
         *
         * @class
         * @name js.LGBasemapBox
         * @extends js.LGMapBasedMenuBox
         * @classdesc
         * Provides a UI holder for the JavaScript API's basemap
         * gallery.
         */

        /**
         * Performs class-specific setup when the dependency is
         * satisfied.
         * @memberOf js.LGBasemapBox#
         * @override
         */
        onDependencyReady: function () {
            var galleryId, galleryHolder, basemapGallery, basemapGroup = this.getBasemapGroup();

            galleryId = this.rootId + "_gallery";

            galleryHolder = new dijit.layout.ContentPane({
                id: galleryId,
                className: this.galleryClass
            }).placeAt(this.rootDiv);
            touchScroll(galleryId);

            basemapGallery = new BasemapGallery({
                showArcGISBasemaps: true,  // ignored if a group is configured
                basemapsGroup: basemapGroup,
                bingMapsKey: this.mapObj.commonConfig.bingMapsKey,
                map: this.mapObj.mapInfo.map
            }, domConstruct.create('div')).placeAt(this.rootDiv);
            galleryHolder.set('content', basemapGallery.domNode);

            basemapGallery.startup();

            this.inherited(arguments);
        },

        getBasemapGroup: function () {
            var basemapGroup = null;

            if (this.basemapgroupTitle && this.basemapgroupOwner &&
                    this.basemapgroupTitle.length > 0 && this.basemapgroupOwner.length > 0) {
                basemapGroup = {
                    "title": this.basemapgroupTitle,
                    "owner": this.basemapgroupOwner
                };
            }

            return basemapGroup;
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGCallMethods", js.LGObject, {
        /**
         * Constructs an LGCallMethods and executes the list of tasks in
         * its definition.
         *
         * @constructor
         * @class
         * @name js.LGCallMethods
         * @extends js.LGObject
         * @classdesc
         * Provides a way for object methods to be called as part of the
         * LGUIBuilder JSON script execution.
         */
        constructor: function () {
            var target,
                pThis = this;

            if (this.todo) {
                // For each item in to-do list, get the id of the item, then call the specified method with the specified arg
                array.forEach(this.todo, function (task) {
                    try {
                        target = dom.byId(task.rootId);
                        if (target) {
                            target = target.getLGObject();
                            if (target) {
                                target[task.method](task.arg);
                            }
                        }
                    } catch (error) {
                        pThis.log("LGCallMethods_1: " + error.toString());
                    }
                });
            }
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGButton", js.LGGraphic, {
        /**
         * Constructs an LGButton.
         *
         * @constructor
         * @class
         * @name js.LGButton
         * @extends js.LGGraphic
         * @classdesc
         * Builds and manages a UI object that represents a button.
         */
        constructor: function () {
            var attrs;

            this.applyTheme(true);

            // If we have an icon, add it to the face of the button
            if (this.iconUrl) {
                attrs = {src: this.iconUrl};
                if (this.iconClass) {
                    attrs.className = this.iconClass;
                }
                this.iconImg = domConstruct.create("img", attrs, this.rootDiv);
            }
            // If we have text, add it to the face of the button
            if (this.displayText) {
                attrs = {innerHTML: this.checkForSubstitution(this.displayText)};
                if (this.displayTextClass) {
                    attrs.className = this.displayTextClass;
                }
                domConstruct.create("div", attrs, this.rootDiv);
            }

            if (this.tooltip) {
                this.rootDiv.title = this.checkForSubstitution(this.tooltip);
            }
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGRadioButton", js.LGButton, {
        /**
         * Constructs an LGRadioButton.
         *
         * @constructor
         * @class
         * @name js.LGRadioButton
         * @extends js.LGButton
         * @classdesc
         * Builds and manages a UI object that represents a pushbutton,
         * a button that shows on and off states, that participates in
         * a radiobutton control.
         */
        constructor: function () {
            // Set the initial state
            this.isOn = this.toBoolean(this.isOn, false);
            this.setIsOn(this.isOn);

            // Placeholder for radiobutton controller integration
            this.controller = null;

            // Use clicks to toggle state
            on(this.rootDiv, "click", this.handleClick);
        },

        /**
         * Sets the radiobutton controller for this button.
         * @param {object} controllerToUse Controller object
         * @memberOf js.LGRadioButton#
         */
        setController: function (controllerToUse) {
            this.controller = controllerToUse;
        },

        /**
         * Sets the button into the on or off state.
         * @param {boolean} isOn Indicates if button should be on (true)
         *        or off
         * @memberOf js.LGRadioButton#
         */
        setIsOn: function (isOn) {
            this.isOn = isOn;
            if (this.isOn) {
                this.applyThemeAltBkgd(true);
            } else {
                this.applyTheme(true);
            }
        },

        /**
         * Handles a click event.
         * @param {object} evt Click event
         * @this {js.LGRadioButton's rootDiv or subclass instance}
         * @private
         * @memberOf js.LGRadioButton#
         */
        handleClick: function (evt) {
            var obj = evt.currentTarget.getLGObject();
            if (obj.controller) {
                obj.controller.selectMember(obj);
            }
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGRadioButtonController", js.LGObject, {
        /**
         * Constructs an LGRadioButtonController.
         *
         * @constructor
         * @class
         * @name js.LGRadioButtonController
         * @extends LGObject
         * @classdesc
         * Manages a set of objects so that one and only one
         * is selected.
         */
        constructor: function () {
            this.members = [];
            this.currentMember = null;
        },

        /**
         * Adds an object to the controller's control and calls the
         * object's setController function to establish a backlink.
         * @param {object} controllee Object to control
         * @memberOf js.LGRadioButtonController#
         */
        addMember: function (controllee) {
            this.members.push(controllee);
            controllee.setController(this);
        },

        /**
         * Selects one of the controller's objects.
         * @param {number|string|object} selection Object to select; if
         *        number, it is the zero-based index of controllees
         *        (indexed in order of insertion); if string, it is a
         *        controllee value to search (the first found is
         *        selected); if an object, it is matched by rootId to
         *        controllees (the first found is selected)
         * @memberOf js.LGRadioButtonController#
         */
        selectMember: function (selection) {
            var idOfNewSelected, pThis = this;

            // Clear current selection
            if (this.currentMember) {
                this.currentMember.setIsOn(false);
                this.currentMember = null;
            }

            // Convert index-based selection to an item
            if (typeof selection === "number") {
                if (this.members.length > 0) {
                    selection = Math.max(0, Math.min(selection, pThis.members.length - 1));
                    pThis.currentMember = pThis.members[selection];
                    pThis.currentMember.setIsOn(true);
                }

            // Switch the selection to the member with the specified value
            } else if (typeof selection === "string") {
                array.some(this.members, function (member) {
                    if (member.value === selection) {
                        pThis.currentMember = member;
                        pThis.currentMember.setIsOn(true);
                        return true;
                    }
                    return false;
                });

            // Switch to the supplied selection by id
            } else if (selection) {
                idOfNewSelected = selection.rootId;
                array.some(this.members, function (member) {
                    if (member.rootId === idOfNewSelected) {
                        pThis.currentMember = member;
                        pThis.currentMember.setIsOn(true);
                        return true;
                    }
                    return false;
                });
            }
        },

        /**
         * Returns the currently-selected controllee.
         * @return {object} Current controllee or null
         * @memberOf js.LGRadioButtonController#
         */
        getCurrentMember: function () {
            return this.currentMember;
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGCommand", [js.LGButton, js.LGDependency], {
        /**
         * Constructs an LGCommand.
         *
         * @param {object} [args.parentDiv] Name of DOM
         *        object into which the LGGraphic is to be placed
         *        (LGGraphic)
         * @param {string} args.rootId Id for root div of created object
         *        (LGGraphic)
         * @param {string} [args.rootClass] Name of CSS class to
         *        use for the root container of the object (LGGraphic)
         * @param {boolean} [args.fill=false] Whether the object should
         *        fill its parent's div or not; if fill is true, the
         *        horizOffset and vertOffset parameters are ignored
         *        (LGGraphic)
         * @param {number} [args.horizOffset] Horizontal offset
         *        flag/value: >0: left side; 0: center; <0: right side;
         *        undefined: no horizontal or vertical adjustment
         *        (LGGraphic)
         * @param {number} [args.vertOffset] Vertical offset
         *        flag/value: >0: top side; 0: center; <0: bottom side;
         *        undefined: no horizontal or vertical adjustment
         *        (LGGraphic)
         *
         * @param {string} [args.iconClass] Name of CSS class to
         *        use for icon
         * @param {string} [args.displayText] Text to display in div;
         *        only used if iconUrl not supplied
         * @param {string} [args.displayTextClass] Name of CSS class to
         *        use for displayText
         *
         * @param {object} [args.values] Key-value pairs for
         *        configurable elements (LGGraphic)
         * @param {string} [args.values.iconUrl] Url to icon to display
         *        in div
         * @param {string} [args.values.tooltip] Text to display as
         *        tooltip
         *
         * @param {object} [args.i18n] Key-value pairs for text
         *        strings for non-configurable elements (LGGraphic)
         *
         * @constructor
         * @class
         * @name js.LGCommand
         * @extends js.LGButton, js.LGDependency
         * @classdesc
         * Builds and manages a UI object that represents a command.
         */
        constructor: function () {
            // Hook up a click on the root div to the click handler; we use the root div so that
            // one can click outside of the icon and text
            if (this.publish) {
                this.clickHandler = on(this.rootDiv, "click", this.handleClick);
            }
        },

        /**
         * Performs class-specific setup before waiting for a
         * dependency.
         * @memberOf js.LGCommand#
         * @override
         */
        onDependencyPrep: function () {
            // Make command invisible until dependency resolved
            this.setIsVisible(false);
            this.inherited(arguments);
        },

        /**
         * Performs class-specific setup when the dependency is
         * satisfied.
         * @memberOf js.LGCommand#
         * @override
         */
        onDependencyReady: function () {
            // Make command invisible until dependency resolved
            this.setIsVisible(true);
            this.inherited(arguments);
        },

        /**
         * Handles a click event.
         * @param {object} evt Click event
         * @this {rootDiv of js.LGCommand's rootDiv or subclass instance}
         * @private
         * @memberOf js.LGCommand#
         */
        handleClick: function (evt) {
            var obj = evt.currentTarget.getLGObject();
            topic.publish("command", obj.publish);
            topic.publish(obj.publish, obj.publishArg);
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGCommandToggle", js.LGCommand, {
        /**
         * Constructs an LGCommandToggle.
         *
         * @constructor
         * @class
         * @name js.LGCommandToggle
         * @extends js.LGCommand
         * @classdesc
         * Builds and manages a UI object that represents a command that
         * can toggle its enabled and/or visibility states.
         */
        constructor: function () {
            var pThis = this;

            // Set initial state
            this.iconDisabledUrl = this.iconDisabledUrl || this.iconUrl;
            this.isEnabled = this.toBoolean(this.isEnabled, true);
            pThis.setIsEnabled(this.isEnabled);

            this.isVisible = this.toBoolean(this.isVisible, true);
            pThis.setIsVisible(this.isVisible);

            // Handle enable/disable triggers
            if (this.triggerEnable) {
                topic.subscribe(this.triggerEnable, function () {
                    pThis.isEnabled = true;
                    pThis.setIsEnabled(pThis.isEnabled);
                });
            }
            if (this.triggerDisable) {
                topic.subscribe(this.triggerDisable, function () {
                    pThis.isEnabled = false;
                    pThis.setIsEnabled(pThis.isEnabled);
                });
            }

            // Handle visible/invisible triggers
            if (this.triggerVisible) {
                topic.subscribe(this.triggerVisible, function () {
                    pThis.isVisible = true;
                    pThis.setIsVisible(pThis.isVisible);
                });
            }
            if (this.triggerInvisible) {
                topic.subscribe(this.triggerInvisible, function () {
                    pThis.isVisible = false;
                    pThis.setIsVisible(pThis.isVisible);
                });
            }
        },

        /**
         * Enables or disables the command.
         * @param {boolean} isEnabled Indicates if graphic should be
         *        enabled (true) or disabled
         * @memberOf js.LGCommandToggle#
         */
        setIsEnabled: function (isEnabled) {
            this.isEnabled = isEnabled;
            if (this.isEnabled) {
                this.iconImg.src = this.iconUrl;
                domClass.add(this.rootDiv, "appThemeHover");
            } else {
                this.iconImg.src = this.iconDisabledUrl;
                domClass.remove(this.rootDiv, "appThemeHover");
            }
        },

        /**
         * Handles a click event.
         * @param {object} evt Click event
         * @this {js.LGCommandToggle's rootDiv or subclass instance}
         * @private
         * @memberOf js.LGCommandToggle#
         * @override
         */
        handleClick: function (evt) {
            var obj = evt.currentTarget.getLGObject();

            if (obj.isEnabled) {
                obj.inherited("handleClick", arguments);
            }
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGLaunchUrl", js.LGObject, {
        /**
         * Constructs an LGLaunchUrl.
         *
         * @constructor
         * @class
         * @name js.LGLaunchUrl
         * @extends js.LGObject
         * @classdesc
         * Opens a URL in response to a message.
         */
        constructor: function () {
            topic.subscribe(this.sameWinTrigger, function (url) {
                if (url) {
                    window.open(url, "_parent");
                }
            });
            topic.subscribe(this.newWinTrigger, function (url) {
                if (url) {
                    window.open(url, "_blank");
                }
            });
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGPrintMap", js.LGMapBasedMenuBox, {
        /**
         * Constructs an LGPrintMap.
         *
         * @constructor
         * @class
         * @name js.LGPrintMap
         * @extends LGMapBasedMenuBox
         * @classdesc
         * Prints the configured map.
         */
        constructor: function () {
            var landscapeBtn, portraitBtn, okBtn, pThis = this;

            // Set up the print dialog box
            this.radioButtonController = new js.LGRadioButtonController();

            landscapeBtn = new js.LGRadioButton({
                rootId: this.rootId + "_landscape",
                parentDiv: this.rootId,
                iconUrl: this.landscapeButtonIconUrl,
                rootClass: this.orientationButtonClass,
                iconClass: this.orientationButtonIconClass,
                tooltip: this.checkForSubstitution(this.landscapeButtonTooltip),
                value: this.landscapeServerSpec
            });
            landscapeBtn.setIsVisible(true);
            this.radioButtonController.addMember(landscapeBtn);
            domStyle.set(landscapeBtn.rootDiv, "display", "inline-block");

            portraitBtn = new js.LGRadioButton({
                rootId: this.rootId + "_portrait",
                parentDiv: this.rootId,
                iconUrl: this.portraitButtonIconUrl,
                rootClass: this.orientationButtonClass,
                iconClass: this.orientationButtonIconClass,
                tooltip: this.checkForSubstitution(this.portraitButtonTooltip),
                value: this.portraitServerSpec
            });
            portraitBtn.setIsVisible(true);
            this.radioButtonController.addMember(portraitBtn);
            domStyle.set(portraitBtn.rootDiv, "display", "inline-block");

            this.titleEntryTextBox = new TextBox({
                id: this.rootId + "_titleEntry",
                value: this.title,
                trim: true,
                placeHolder: this.titleHint
            }).placeAt(this.rootId);
            domStyle.set(this.titleEntryTextBox.domNode, "width", "97%");
            domClass.add(this.titleEntryTextBox.domNode, this.titleClass);

            this.authorEntryTextBox = new TextBox({
                id: this.rootId + "_authorEntry",
                value: this.author,
                trim: true,
                placeHolder: this.authorHint
            }).placeAt(this.rootId);
            domStyle.set(this.authorEntryTextBox.domNode, "width", "97%");
            domClass.add(this.authorEntryTextBox.domNode, this.authorClass);

            okBtn = new js.LGButton({
                rootId: this.rootId + "_doPrint",
                parentDiv: this.rootId,
                iconUrl: this.printButtonIconUrl,
                rootClass: this.printButtonClass,
                iconClass: this.printButtonIconClass,
                tooltip: this.checkForSubstitution(this.printButtonTooltip)
            });
            okBtn.setIsVisible(true);
            domStyle.set(okBtn.rootDiv, "display", "inline-block");

            this.radioButtonController.selectMember(0);

            // Await the OK from our dialog before launching print job
            on(okBtn.rootDiv, "click", function () {
                var selectedLayout, printParams;

                // Broadcast status; our LGDropdownBox ancestor has already made our dialog box visible
                topic.publish(pThis.publishWorking);

                // Hide the dialog box; we don't need to have it take up space while
                // the server is off doing the print job
                pThis.setIsVisible(false);

                // Create print parameters with full template
                selectedLayout = pThis.radioButtonController.getCurrentMember();
                selectedLayout = selectedLayout ? selectedLayout.value : null;

                printParams = new PrintParameters();
                printParams.map = pThis.mapObj.mapInfo.map;
                printParams.outSpatialReference = pThis.mapObj.mapInfo.map.spatialReference;
                printParams.template = new PrintTemplate();
                printParams.template.format = pThis.format || "PDF";
                printParams.template.layout = selectedLayout || pThis.layout || "Letter ANSI A Landscape";
                printParams.template.layoutOptions = {
                    titleText: pThis.titleEntryTextBox.value,
                    authorText: pThis.authorEntryTextBox.value,
                    copyrightText: pThis.copyrightText
                };
                printParams.template.preserveScale = pThis.toBoolean(pThis.preserveScale, false);
                printParams.template.showAttribution = true;

                // Run the job
                pThis.printTask.execute(printParams,
                    function (result) {
                        /* success */
                        // Broadcast status
                        topic.publish(pThis.publishReady);
                        topic.publish(pThis.publishPrintUrl, result.url);
                    }, function (error) {
                        /* failure */
                        // Broadcast status
                        topic.publish(pThis.publishReady);
                        pThis.log("Print failed: " + error.message, true);
                    }
                    );
            });
        },

        /**
         * Checks that the instance has its prerequisites.
         * @throws {string} "no print task configured" if the the
         *        common configuration does not include a print
         *        task
         * @memberOf js.LGPrintMap#
         * @override
         */
        checkPrerequisites: function () {
            if (this.commonConfig.helperServices &&
                    this.commonConfig.helperServices.printTask &&
                    this.commonConfig.helperServices.printTask.url) {
                this.printTask = new PrintTask(
                    this.commonConfig.helperServices.printTask.url,
                    {
                        async: false  // depends on print service
                    }
                );
            } else {
                this.log("no print task configured");
                throw "no print task configured";
            }
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGFetchPrintedMap", [js.LGObject, js.LGMapDependency], {
        /**
         * Constructs an LGFetchPrintedMap.
         *
         * @constructor
         * @class
         * @name js.LGFetchPrintedMap
         * @extends js.LGObject, js.LGMapDependency
         * @classdesc
         * In response to a message, responds with another message with
         * the URL of the printed map.
         */
        constructor: function () {
            this.fetchPrintUrl = null;
            this.printAvailabilityTimeoutMinutes = this.toNumber(this.printAvailabilityTimeoutMinutes, 10);  // minutes
            this.printTimeouter = null;
        },

        /**
         * Performs class-specific setup when the dependency is
         * satisfied.
         * @memberOf js.LGFetchPrintedMap#
         * @override
         */
        onDependencyReady: function () {
            var pThis = this;
            // Now that the map (our dependency) is ready, finish setup

            // Cache the URL to the print when triggered
            topic.subscribe(this.triggerPrintUrl, function (url) {
                // Cancel any timeout we've got going
                clearTimeout(pThis.printTimeouter);

                // Make the URL available
                pThis.fetchPrintUrl = url;
                topic.publish(pThis.publishPrintAvailable);

                // Set up an expiration for this URL
                if (pThis.printAvailabilityTimeoutMinutes > 0) {
                    pThis.printTimeouter = setTimeout(function () {
                        topic.publish(pThis.publishPrintNotAvailable);
                    }, pThis.printAvailabilityTimeoutMinutes * 60000);
                }
            });

            // Fetch the print when triggered
            topic.subscribe(this.trigger, function () {
                if (pThis.fetchPrintUrl !== null) {
                    topic.publish(pThis.publish, pThis.fetchPrintUrl);
                }
            });
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGLocate", js.LGObject, {
        /**
         * Constructs an LGLocate.
         *
         * @constructor
         * @class
         * @name js.LGLocate
         * @extends js.LGObject
         * @classdesc
         * In response to a message, responds with another message with
         * the browser's location.
         */
        constructor: function () {
            var pThis = this, backupTimeoutTimer,
                // Make backup timeout that's later than the geolocation timeout
                // so that we don't get overlapping timeouts. Also, the backup
                // timeout occurs if the user takes too long to decide to accept
                // or to deny the location request (no harm in this--just an alert
                // appears).
                cTimeout = 8000, cBackupTimeout = 16000;  // timeouts are in ms

            // Object is ready only if geolocation is supported
            this.ready = new Deferred();
            if (!Modernizr.geolocation) {
                this.ready.reject(pThis);

            } else {
                // Start listening for a position request
                topic.subscribe(this.trigger, function () {

                    // Set a backup timeout because if one chooses "not now" for providing
                    // the position, the geolocation call does not return or time out
                    backupTimeoutTimer = setTimeout(function () {
                        alert(pThis.checkForSubstitution("@messages.geolocationTimeout"));
                    }, cBackupTimeout);

                    // Try to get the current position
                    navigator.geolocation.getCurrentPosition(function (position) {
                        clearTimeout(backupTimeoutTimer);

                        pThis.log("go to " + position.coords.latitude + " " + position.coords.longitude);
                        topic.publish(pThis.publish, new esri.geometry.Point(
                            position.coords.longitude,
                            position.coords.latitude,
                            new esri.SpatialReference({ wkid: 4326 })
                        ));
                    }, function (error) {
                        var message;
                        clearTimeout(backupTimeoutTimer);

                        // Report the location failure
                        switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = pThis.checkForSubstitution("@messages.geolocationDenied");
                            break;
                        case error.TIMEOUT:
                            message = pThis.checkForSubstitution("@messages.geolocationTimeout");
                            break;
                        default:
                            message = pThis.checkForSubstitution("@messages.geolocationUnavailable");
                            break;
                        }
                        alert(message);
                    }, {
                        timeout: cTimeout
                    });
                });
                this.ready.resolve(pThis);
            }
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGSearch", js.LGObject, {
        /**
         * LGSearch
         *
         * @constructor
         * @class
         * @name js.LGSearch
         * @extends js.LGObject
         * @classdesc
         * Provides a base class for searchers.
         */
        constructor: function () {
            if (this.busyIndicator) {
                this.busyIndicator = dom.byId(this.busyIndicator).getLGObject();
            }
        },

        /**
         * Launches a search of the instance's search type.
         * @param {string|geometry} searchText Text or geometry to search
         * @param {function} callback Function to call when search
         *        results arrive
         * @param {function} errback Function to call when search
         *        fails
         * @memberOf js.LGSearch#
         * @see Interface stub
         */
        search: function () {
            return null;
        },

        /**
         * Formats results into a list of structures; each structure
         * contains a label and an optional data structure.
         * @param {object} results Search-specific results
         * @param {string} [searchText] Search text
         * @return {array} List of structures
         * @memberOf js.LGSearch#
         * @see Interface stub
         */
        toList: function () {
            return [];
        },

        /**
         * Publishes the specified data after performing any post
         * processing.
         * @param {string} subject Publishing topic name
         * @param {object} [data] Object to publish under topic
         * @memberOf js.LGSearch#
         * @see Interface stub. The data are those set up by the toList
         *       function and could be final or intermediate results.
         *       For intermediate results, the publish function is the
         *       place for the searcher to complete the data-retrieval
         *       process before publishing.
         */
        publish: function (subject, data) {
            topic.publish(subject, data);
        },

        /**
         * Provides an array sort function that sorts by the "label"
         * attribute of the supplied items.
         * @param {object} a Array sort item
         * @param {object} b Array sort item
         * @return {number} -1 if a<b, 0 if a=b, and 1 if a>b;
         *         comparison uses the label's localCompare() function
         * @memberOf js.LGSearch#
         */
        sortByLabel: function (a, b) {
            var sortResult = 0;
            if (a && b && a.label && b.label) {
                sortResult = a.label.localeCompare(b.label);
            }
            return sortResult;
        },

        /**
         * Returns a point that represents the geometry.
         * @param {object} geom Some geometry
         * @return {object} if geom is a point, returns geom; if geom is
         *         a polygon, returns the centerpoint of the polygon if
         *         that centerpoint is within geom; otherwise, returns
         *         the first point of the polygon; if geom is a
         *         polyline, returns the first point of geom
         * @memberOf js.LGSearch#
         */
        getRepresentativePoint: function (geom) {
            var repPoint;

            if ("point" === geom.type) {
                repPoint = geom;
            } else if ("polygon" === geom.type) {
                repPoint = geom.getExtent().getCenter();
                if (!geom.contains(repPoint)) {
                    repPoint = geom.getPoint(0, 0);
                }
            } else if ("polyline" === geom.type) {
                repPoint = geom.getPoint(0, 0);
            }

            return repPoint;
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGSearchAddress", js.LGSearch, {
        /**
         * Constructs an LGSearchAddress.
         *
         * @constructor
         * @class
         * @name js.LGSearchAddress
         * @extends js.LGSearch
         * @classdesc
         * Provides a searcher for addresses.
         */
        constructor: function () {
            this.searcher = new esri.tasks.Locator(this.searchUrl);
            this.searcher.outSpatialReference = new esri.SpatialReference({"wkid": this.outWkid});
            this.params = {};
            this.params.outFields = this.outFields;
            this.ready = new Deferred();
            this.ready.resolve(this);
        },

        /**
         * Launches a search of the instance's search type.
         * @param {string|geometry} searchText Text or geometry to search
         * @param {function} callback Function to call when search
         *        results arrive; function takes the results as its sole
         *        argument
         * @memberOf js.LGSearchAddress#
         * @override
         */
        search: function (searchText, callback, errback) {
            this.params.address = {};
            this.params.address[this.addressParamName] = searchText;
            this.searcher.addressToLocations(this.params, callback, errback);
        },

        /**
         * Formats results into a list of structures; each structure
         * contains a label and an optional data structure.
         * @param {object} results Search-specific results
         * @param {string} [searchText] Search text
         * @return {array} List of structures; label is tagged with
         *         "label" and data is tagged with "data"
         * @memberOf js.LGSearchAddress#
         * @override
         */
        toList: function (results) {
            var ok, pThis = this, resultsList = [];
            if (results) {
                // Filter results by desired score and locator
                array.forEach(results, function (item) {
                    ok = false;
                    if (item.score >= pThis.minimumScore) {
                        if (pThis.validLocators) {
                            array.some(pThis.validLocators, function (entry) {
                                if (item.attributes.Loc_name === entry) {
                                    ok = true;
                                    return true;
                                }
                            });
                        } else {
                            ok = true;
                        }
                    }
                    if (ok) {
                        resultsList.push({
                            "label": item.address,
                            "data": new esri.geometry.Point(
                                item.location.x,
                                item.location.y,
                                new esri.SpatialReference({ wkid: 102100 })
                            )
                        });
                    }
                });
            }
            return resultsList;
        },

        /**
         * Publishes the specified data after performing any post
         * processing.
         * @param {string} subject Publishing topic name
         * @param {object} data Object to publish under topic
         * @see Interface stub. The data are those set up by the toList
         *       function and could be final or intermediate results.
         *       For intermediate results, the publish function is the
         *       place for the searcher to complete the data-retrieval
         *       process before publishing.
         * @memberOf js.LGSearchAddress#
         * @override
         */
        publish: function (subject, data) {
            topic.publish(subject, data);
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGSearchBoxByText", js.LGDropdownBox, {
        /**
         * Constructs an LGSearchBoxByText.
         *
         * @constructor
         * @class
         * @name js.LGSearchBoxByText
         * @extends js.LGDropdownBox
         * @classdesc
         * Provides a UI display of a prompted text box followed by a
         * list of results.
         */
        constructor: function () {
            var pThis = this, textBoxId, searchEntryTextBox, resultsListBox, table, tableBody,
                searcher, lastSearchString, lastSearchTime, stagedSearch;

            textBoxId = this.rootId + "_entry";

            domConstruct.create("label",
                {"for": textBoxId, innerHTML: this.checkForSubstitution(this.showPrompt)}, this.rootId);
            searchEntryTextBox = new TextBox({
                id: textBoxId,
                value: "",
                trim: true,
                placeHolder: this.hint,
                intermediateChanges: true
            }).placeAt(this.rootId);
            domStyle.set(searchEntryTextBox.domNode, "width", "99%");

            resultsListBox = domConstruct.create("div",
                {className: this.resultsListBoxClass}, this.rootId);
            table = domConstruct.create("table",
                {className: this.resultsListTableClass}, resultsListBox);
            tableBody = domConstruct.create("tbody",
                {className: this.resultsListBodyClass}, table);
            touchScroll(resultsListBox);

            searcher = dom.byId(this.searcher).getLGObject();
            lastSearchString = "";
            lastSearchTime = 0;
            stagedSearch = null;

            // Run a search when the entry text changes
            on(searchEntryTextBox, "change", function () {
                var searchText = searchEntryTextBox.get("value");
                if (lastSearchString !== searchText) {
                    lastSearchString = searchText;
                    domConstruct.empty(tableBody);

                    // Clear any staged search
                    clearTimeout(stagedSearch);

                    if (searchText.length > 0) {
                        // Stage a new search, which will launch if no new searches show up
                        // before the timeout
                        stagedSearch = setTimeout(function () {
                            var searchingPlaceholder, thisSearchTime, now;

                            searchingPlaceholder = domConstruct.create("tr", null, tableBody);
                            domConstruct.create("td",
                                {className: pThis.resultsListSearchingClass}, searchingPlaceholder);

                            thisSearchTime = lastSearchTime = (new Date()).getTime();
                            searcher.search(searchText, function (results) {
                                var resultsList;

                                // Discard searches made obsolete by new typing from user
                                if (thisSearchTime < lastSearchTime) {
                                    return;
                                }

                                // Show results
                                domConstruct.empty(tableBody);  // to get rid of searching indicator
                                resultsList = searcher.toList(results, searchText);

                                now = (new Date()).getTime();
                                pThis.log("retd " + resultsList.length + " items in "
                                    + (now - thisSearchTime) / 1000 + " secs");

                                if (resultsList.length > 0) {
                                    array.forEach(resultsList, function (item) {
                                        var tableRow, tableCell;

                                        tableRow = domConstruct.create("tr",
                                            null, tableBody);
                                        tableCell = domConstruct.create("td",
                                            {className: pThis.resultsListEntryClass, innerHTML: item.label}, tableRow);
                                        pThis.applyTheme(true, tableCell);
                                        on(tableCell, "click", function () {
                                            searcher.publish(pThis.publish, item.data);
                                        });
                                    });
                                }
                            }, function (error) {
                                // Query failure
                                pThis.log("LGSearchBoxByText_1: " + error.message);

                                lastSearchString = "";  // so that we can quickly repeat this search
                                domConstruct.empty(tableBody);  // to get rid of searching indicator
                            });
                        }, 1000);
                    }
                }
            });
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGSearchFeatureLayer", [js.LGSearch, js.LGMapDependency], {
        /**
         * Constructs an LGSearchFeatureLayer.
         *
         * @constructor
         * @class
         * @name js.LGSearchFeatureLayer
         * @extends js.LGSearch, js.LGMapDependency
         * @classdesc
         * Provides a searcher for feature layers.
         */
        constructor: function () {
            if (!this.searchPattern || this.searchPattern.indexOf("${1}") < 0) {
                this.searchPattern = "%${1}%";
            }
            this.caseInsensitiveSearch = this.toBoolean(this.caseInsensitiveSearch, true);
            this.ready = new Deferred();
        },

        /**
         * Performs class-specific setup when the dependency is
         * satisfied.
         * @memberOf js.LGSearchFeatureLayer#
         * @override
         */
        onDependencyReady: function () {
            // Now that the map (our dependency) is ready, get the URL of the search layer from it
            var searchLayer, reason, message, availableFields = ",", opLayers,
                popupTemplate = null, pThis = this;

            try {
                searchLayer = this.mapObj.getLayer(this.searchLayerName);
                if (!searchLayer || !searchLayer.url) {
                    reason = this.checkForSubstitution("@messages.searchLayerMissing");
                } else {
                    this.searchURL = searchLayer.url;

                    // Check for existence of fields
                    array.forEach(searchLayer.fields, function (layerField) {
                        availableFields += layerField.name + ",";
                    });
                    if (!array.every(this.searchFields, function (searchField) {
                            reason = searchField;
                            return availableFields.indexOf("," + searchField + ",") >= 0;
                        })) {

                        // Failed to find the field in the search layer; provide some feedback
                        message = "\"" + reason + "\"<br>";
                        message += this.checkForSubstitution("@messages.searchFieldMissing") + "<br><hr><br>";
                        message += this.checkForSubstitution("@prompts.layerFields") + "<br>";
                        if (availableFields.length > 1) {
                            message += availableFields.substring(1, availableFields.length - 1);
                        }
                        this.log(message, true);
                    }

                    // Set up our query task now that we have the URL to the layer
                    this.objectIdField = searchLayer.objectIdField;
                    this.publishPointsOnly = (typeof this.publishPointsOnly === "boolean") ? this.publishPointsOnly : true;

                    this.searcher = new esri.tasks.QueryTask(this.searchURL);

                    // Set up the general layer query task: pattern match
                    this.generalSearchParams = new esri.tasks.Query();
                    this.generalSearchParams.returnGeometry = false;
                    this.generalSearchParams.outSpatialReference = this.mapObj.mapInfo.map.spatialReference;
                    this.generalSearchParams.outFields = [searchLayer.objectIdField].concat(this.searchFields);

                    // Set up the specific layer query task: object id
                    this.objectSearchParams = new esri.tasks.Query();
                    this.objectSearchParams.returnGeometry = true;
                    this.objectSearchParams.outSpatialReference = this.mapObj.mapInfo.map.spatialReference;
                    this.objectSearchParams.outFields = ["*"];

                    // Get the popup for this layer & send it to the map
                    opLayers = this.mapObj.mapInfo.itemInfo.itemData.operationalLayers;
                    array.some(opLayers, function (layer) {
                        if (layer.title === pThis.searchLayerName) {
                            popupTemplate = new esri.dijit.PopupTemplate(layer.popupInfo);
                            return true;
                        }
                        return false;
                    });
                    this.mapObj.setPopup(popupTemplate);

                    this.log("Search layer " + this.searchLayerName + " set up for queries");
                    this.ready.resolve(this);
                    this.inherited(arguments);
                    return;
                }
            } catch (error) {
                reason = error.toString();
            }

            // Failed to find the search layer; provide some feedback
            message = "\"" + this.searchLayerName + "\"<br>";
            message += reason + "<br><hr><br>";
            message += this.checkForSubstitution("@prompts.mapLayers") + "<br><ul>";
            array.forEach(this.mapObj.getLayerNameList(), function (layerName) {
                message += "<li>\"" + layerName + "\"</li>";
            });
            message += "</ul>";
            this.log(message, true);

            this.ready.reject(this);
            this.inherited(arguments);
        },

        /**
         * Checks that the instance has its prerequisites.
         * @throws {string} "missing search fields" if the search fields
         *        parameter is omitted
         * @memberOf js.LGSearchFeatureLayer#
         * @override
         */
        checkPrerequisites: function () {
            var splitFields, pThis = this;

            if (this.searchFields && 0 < this.searchFields.length) {
                splitFields = this.searchFields.split(",");
                this.searchFields = [];
                array.forEach(splitFields, function (searchField) {
                    pThis.searchFields.push(searchField.trim());
                });
            } else {
                this.log("missing search fields");
                throw "missing search fields";
            }
        },

        /**
         * Launches a search.
         * @param {string|geometry} searchText Text to search
         * @param {function} callback Function to call when search
         *        results arrive; function takes the results as its sole
         *        argumentsss
         * @memberOf js.LGSearchFeatureLayer#
         * @override
         */
        search: function (searchText, callback, errback) {
            var processedSearchText,
                searchParam = "",
                attributePattern,
                attributeSeparator = "",
                attributeSeparatorReset = "  OR  ";  // thanks to Tim H.: single spaces don't work with some DBs

            // Prepare the search term and the search query pattern for the desired casing handling
            if (this.caseInsensitiveSearch === true) {
                processedSearchText = searchText.toUpperCase();
                attributePattern = "UPPER(${0}) LIKE '" + this.searchPattern + "'";
            } else {
                processedSearchText = searchText;
                attributePattern = "${0} LIKE '" + this.searchPattern + "'";
            }

            // Escape single quotes, which are used to bound the search term in the query
            processedSearchText = processedSearchText.replace(/'/g, "''");

            // Replace the search term into the search query for each field to be searched
            array.forEach(this.searchFields, function (searchField) {
                searchParam = searchParam + attributeSeparator
                    + dojo.string.substitute(attributePattern, [searchField, processedSearchText]);
                attributeSeparator = attributeSeparatorReset;
            });

            // Launch the combined query
            if (0 < searchParam.length) {
                this.generalSearchParams.where = searchParam;
                this.searcher.execute(this.generalSearchParams, callback, errback);
            }
        },

        /**
         * Formats results into a list of structures; each structure
         * contains a label and an optional data structure.
         * @param {object} results Search-specific results
         * @param {string} searchText Search text
         * @return {array} List of structures; label is tagged with
         *         "label" and data is tagged with "data"
         * @memberOf js.LGSearchFeatureLayer#
         * @override
         */
        toList: function (results, searchText) {
            var pThis = this, resultsList = [], possibleLabel, representativeLabel,
                processedSearchText = searchText.toUpperCase();

            if (results && results.features && 0 < results.features.length) {
                // Create the results list
                array.forEach(results.features, function (item) {

                    // Test each non-null search field result and pick the first one
                    // that contains the search string as our label
                    representativeLabel = "";
                    array.some(pThis.searchFields, function (searchField) {
                        if (item.attributes[searchField]) {
                            possibleLabel = item.attributes[searchField].toString();
                            if (possibleLabel.toUpperCase().indexOf(processedSearchText) >= 0) {
                                representativeLabel = possibleLabel;
                                return true;
                            }
                        }
                        return false;
                    });

                    if (representativeLabel === "") {
                        representativeLabel = "result";
                    }

                    // Create the entry for this result
                    resultsList.push({
                        "label": representativeLabel,
                        "data": item.attributes[pThis.objectIdField]
                    });
                });

                // Results are sorted by their label field
                resultsList.sort(pThis.sortByLabel);
            }

            return resultsList;
        },

        /**
         * Publishes the specified data after performing any post
         * processing.
         * @param {string} subject Publishing topic name
         * @param {object} data Object to publish under topic
         * @see Interface stub. The data are those set up by the toList
         *       function and could be final or intermediate results.
         *       For intermediate results, the publish function is the
         *       place for the searcher to complete the data-retrieval
         *       process before publishing.
         * @memberOf js.LGSearchFeatureLayer#
         * @override
         */
        publish: function (subject, data) {
            var item, representativeData, pThis = this;

            if (this.busyIndicator) {
                this.busyIndicator.setIsVisible(true);
            }

            // Search for the supplied object id
            this.objectSearchParams.where = this.objectIdField + "=" + data;
            this.searcher.execute(this.objectSearchParams, function (results) {
                if (results && results.features && 0 < results.features.length) {
                    item = results.features[0];

                    if (pThis.publishPointsOnly) {
                        // Find a point that can be used to represent this item
                        representativeData = pThis.getRepresentativePoint(item.geometry);
                    } else {
                        representativeData = item;
                    }

                    topic.publish(subject, representativeData);
                } else {
                    // No-results failure
                    pThis.log("LGSearchFeatureLayer_1: no results");
                }

                if (pThis.busyIndicator) {
                    pThis.busyIndicator.setIsVisible(false);
                }
            }, function (error) {
                // Query failure
                pThis.log("LGSearchFeatureLayer_2: " + error.message);

                if (pThis.busyIndicator) {
                    pThis.busyIndicator.setIsVisible(false);
                }
            });
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGShare", js.LGObject, {
        /**
         * Constructs an LGShare.
         *
         * @constructor
         * @class
         * @name js.LGShare
         * @extends js.LGObject
         * @classdesc
         * Provides the base capability for sharing.
         */
        constructor: function () {
            var pThis = this;
            if (this.busyIndicator) {
                this.busyIndicator = dom.byId(this.busyIndicator).getLGObject();
            }
            topic.subscribe(this.trigger, function () {
                pThis.share();
            });
        },

        /**
         * Performs sharing steps:  get URL, compress it, publish
         * result.
         * @memberOf js.LGShare
         */
        share: function () {
            var pThis = this, subjectLine, urlToShare, compressionUrl;
            subjectLine = encodeURIComponent(this.getSubject());
            urlToShare = encodeURIComponent(this.getUrlToShare());

            if (this.tinyURLServiceURL && this.tinyURLServiceURL.length > 0) {
                // Put the URL to share into the compression method's URL & launch the compression
                if (this.busyIndicator) {
                    this.busyIndicator.setIsVisible(true);
                }

                compressionUrl = esri.substitute({url: urlToShare}, this.tinyURLServiceURL);
                esri.request({
                    url: compressionUrl,
                    handleAs: "json"
                }, {
                    useProxy: false
                }).then(function (response) {
                    var tinyUrl, shareUrl;

                    try {
                        // Step thru the chain of nested attributes to get to the tiny URL
                        tinyUrl = pThis.followAttributePath(response, pThis.tinyURLResponseAttribute);
                        if (tinyUrl) {
                            // Put the tiny URL into the sharing method's URL & launch the sharing method
                            shareUrl = esri.substitute({subject: subjectLine, url: tinyUrl}, pThis.shareUrl);
                            topic.publish(pThis.publish, shareUrl);
                        }
                    } catch (error) {
                        pThis.log("LGShare_1: " + error.toString());
                    }

                    if (pThis.busyIndicator) {
                        pThis.busyIndicator.setIsVisible(false);
                    }

                }, function (error) {
                    pThis.log("LGShare_2: " + error.toString());

                    if (pThis.busyIndicator) {
                        pThis.busyIndicator.setIsVisible(false);
                    }
                });
            } else {
                // Share the uncompressed URL
                urlToShare = esri.substitute({subject: subjectLine, url: urlToShare}, this.shareUrl);
                topic.publish(this.publish, urlToShare);
            }
        },

        /**
         * Returns the subject message to use in the sharing.
         * @return {string} subject
         * @memberOf js.LGShare
         */
        getSubject: function () {
            return "";
        },

        /**
         * Returns the app's URL as the item to share.
         * @return {string} URL
         * @memberOf js.LGShare
         */
        getUrlToShare: function () {
            return this.getAppUrl();
        },

        /**
         * Returns the app's URL.
         * @return {string} URL
         * @memberOf js.LGShare
         */
        getAppUrl: function () {
            return window.location.toString();
        }
    });

    //========================================================================================================================//

    dojo.declare("js.LGShareAppExtents", [js.LGShare, js.LGMapDependency], {
        /**
         * LGShareAppExtents
         *
         * @class
         * @name js.LGShareAppExtents
         * @extends js.LGShare, js.LGMapDependency
         * @classdesc
         * Extends simple sharing to include the app's map's current
         * extents.
         */

        /**
         * Returns the subject message to use in the sharing.
         * @return {string} subject
         * @memberOf js.LGShareAppExtents
         * @override
         */
        getSubject: function () {
            var subjectText = "";
            if (this.subject) {
                subjectText = this.checkForSubstitution(this.subject);
            }
            return subjectText;
        },

        /**
         * Returns the app's URL and its extents as the item to share.
         * @return {string} URL
         * @memberOf js.LGShareAppExtents
         * @override
         */
        getUrlToShare: function () {
            var baseUrl = this.getAppUrl();
            return baseUrl + (baseUrl.indexOf("?") < 0 ? "?" : "&") + this.getMapExtentsArg();
        },

        /**
         * Gets the app's map's extents.
         * @return {string} Extents as supplied by LGMap's
         *         getExtentsString()
         * @memberOf js.LGShareAppExtents
         */
        getMapExtentsArg: function () {
            return "ex=" + this.mapObj.getExtentsString();
        }
    });

    //========================================================================================================================//

});
