"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var html2canvas = require("html2canvas");
var OrgChart = (function () {
    function OrgChart(options) {
        var _this = this;
        this._name = 'OrgChart';
        this.html2canvas = html2canvas;
        var defaultOptions = {
            nodeTitle: 'name',
            nodeId: 'id',
            toggleSiblingsResp: false,
            depth: 999,
            chartClass: '',
            exportFilename: 'OrgChart',
            parentNodeSymbol: 'fa-users',
            draggable: false,
            direction: 't2b',
            pan: false,
            zoom: false,
            fullHeight: false,
        };
        var opts = Object.assign(defaultOptions, options);
        var data = opts.data;
        var chart = document.createElement('div');
        var chartContainer = document.querySelector(opts.chartContainer);
        this.options = opts;
        delete this.options.data;
        this.chart = chart;
        this.chartContainer = chartContainer;
        this.currentNode = null;
        chart.dataset.options = JSON.stringify(opts);
        chart.setAttribute('class', 'orgchart' + (opts.chartClass !== '' ? ' ' + opts.chartClass : '') +
            (opts.direction !== 't2b' ? ' ' + opts.direction : ''));
        if (typeof data === 'object') {
            this.buildHierarchy(chart, opts.ajaxURL ? data : this._attachRel(data, '00'), 0, function () {
                if (opts.fullHeight) {
                    _this.resizeChart();
                }
                _this.repositionChart();
            });
        }
        else if (typeof data === 'string' && data.startsWith('#')) {
            this.buildHierarchy(chart, this._buildJsonDS(document.querySelector(data).children[0]), 0, function () {
                if (opts.fullHeight) {
                    _this.resizeChart();
                }
                _this.repositionChart();
            });
        }
        else {
            var spinner = document.createElement('i');
            spinner.setAttribute('class', 'fa fa-circle-o-notch fa-spin spinner');
            chart.appendChild(spinner);
            this._getJSON(data).then(function (resp) {
                _this.buildHierarchy(chart, (opts.ajaxURL ? resp : _this._attachRel(resp, '00')), 0);
                var spinnerInner = chart.querySelector('.spinner');
                spinnerInner.parentNode.removeChild(spinnerInner);
                if (opts.fullHeight) {
                    _this.resizeChart();
                }
                _this.repositionChart();
            })
                .catch(function (err) {
                console.error('failed to fetch datasource for orgchart', err);
            });
        }
        chartContainer.addEventListener('click', this._clickChart.bind(this));
        window.addEventListener('resize', this.resizeChart.bind(this));
        if (opts.exportButton && !chartContainer.querySelector('.oc-export-btn')) {
            var exportBtn = document.createElement('button');
            var downloadBtn = document.createElement('a');
            exportBtn.setAttribute('class', 'oc-export-btn' + (opts.chartClass !== '' ? ' ' + opts.chartClass : ''));
            exportBtn.innerHTML = 'Export';
            exportBtn.addEventListener('click', this._clickExportButton.bind(this));
            downloadBtn.setAttribute('class', 'oc-download-btn' + (opts.chartClass !== '' ? ' ' + opts.chartClass : ''));
            downloadBtn.setAttribute('download', opts.exportFilename + '.png');
            chartContainer.appendChild(exportBtn);
            chartContainer.appendChild(downloadBtn);
        }
        if (opts.pan) {
            chartContainer.style.overflow = 'hidden';
            chartContainer.addEventListener('mousedown', this._onPanStart.bind(this));
            chartContainer.addEventListener('touchstart', this._onPanStart.bind(this));
            document.body.addEventListener('mouseup', this._onPanEnd.bind(this));
            document.body.addEventListener('touchend', this._onPanEnd.bind(this));
        }
        if (opts.zoom) {
            chartContainer.addEventListener('wheel', this._onWheeling.bind(this));
            chartContainer.addEventListener('touchstart', this._onTouchStart.bind(this));
            document.body.addEventListener('touchmove', this._onTouchMove.bind(this));
            document.body.addEventListener('touchend', this._onTouchEnd.bind(this));
        }
        chartContainer.appendChild(chart);
    }
    Object.defineProperty(OrgChart.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    OrgChart.prototype._closest = function (el, fn) {
        return el && ((fn(el) && el !== this.chart) ? el : this._closest(el.parentNode, fn));
    };
    OrgChart.prototype._siblings = function (el, expr) {
        return Array.from(el.parentNode.children).filter(function (child) {
            if (child !== el) {
                if (expr) {
                    return el.matches(expr);
                }
                return true;
            }
            return false;
        });
    };
    OrgChart.prototype._prevAll = function (el, expr) {
        var sibs = [];
        var prevSib = el.previousElementSibling;
        while (prevSib) {
            if (!expr || prevSib.matches(expr)) {
                sibs.push(prevSib);
            }
            prevSib = prevSib.previousElementSibling;
        }
        return sibs;
    };
    OrgChart.prototype._nextAll = function (el, expr) {
        var sibs = [];
        var nextSib = el.nextElementSibling;
        while (nextSib) {
            if (!expr || nextSib.matches(expr)) {
                sibs.push(nextSib);
            }
            nextSib = nextSib.nextElementSibling;
        }
        return sibs;
    };
    OrgChart.prototype._isVisible = function (el) {
        return el.offsetParent !== null;
    };
    OrgChart.prototype._addClass = function (elements, classNames) {
        if (elements.length) {
            elements.forEach(function (el) {
                if (classNames.indexOf(' ') > 0) {
                    classNames.split(' ').forEach(function (className) { return el.classList.add(className); });
                }
                else {
                    el.classList.add(classNames);
                }
            });
        }
        else {
            if (classNames.indexOf(' ') > 0) {
                classNames.split(' ').forEach(function (className) { return elements.classList.add(className); });
            }
            else {
                if (elements.classList) {
                    elements.classList.add(classNames);
                }
            }
        }
    };
    OrgChart.prototype._removeClass = function (elements, classNames) {
        if (elements.length) {
            elements.forEach(function (el) {
                if (classNames.indexOf(' ') > 0) {
                    classNames.split(' ').forEach(function (className) {
                        el.classList.remove(className);
                    });
                }
                else {
                    el.classList.remove(classNames);
                }
            });
        }
        else {
            if (classNames.indexOf(' ') > 0) {
                classNames.split(' ').forEach(function (className) {
                    elements.classList.remove(className);
                });
            }
            else {
                if (elements.classList) {
                    elements.classList.remove(classNames);
                }
            }
        }
    };
    OrgChart.prototype._css = function (elements, prop, val) {
        elements.forEach(function (el) {
            el.style[prop] = val;
        });
    };
    OrgChart.prototype._removeAttr = function (elements, attr) {
        elements.forEach(function (el) {
            el.removeAttribute(attr);
        });
    };
    OrgChart.prototype._one = function (el, type, listener, self) {
        var one = function (event) {
            try {
                listener.call(self, event);
            }
            finally {
                el.removeEventListener(type, one);
            }
        };
        el.addEventListener(type, one);
    };
    OrgChart.prototype._getDescElements = function (ancestors, selector) {
        var results = [];
        ancestors.forEach(function (el) { return results.push.apply(results, el.querySelectorAll(selector)); });
        return results;
    };
    OrgChart.prototype._getJSON = function (url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            function handler() {
                if (this.readyState !== 4) {
                    return;
                }
                if (this.status === 200) {
                    if (typeof this.response !== 'object') {
                        resolve(JSON.parse(this.response));
                    }
                    else {
                        resolve(this.response);
                    }
                }
                else {
                    reject(new Error(this.statusText));
                }
            }
            xhr.open('GET', url);
            xhr.onreadystatechange = handler;
            xhr.responseType = 'json';
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send();
        });
    };
    OrgChart.prototype._buildJsonDS = function (li) {
        var _this = this;
        var subObj = {
            name: li.firstChild.textContent.trim(),
            relationship: (li.parentNode.parentNode.nodeName === 'LI' ? '1' : '0') +
                (li.parentNode.children.length > 1 ? 1 : 0) + (li.children.length ? 1 : 0),
        };
        if (li.id) {
            subObj.id = li.id;
        }
        if (li.querySelector('ul')) {
            Array.from(li.querySelector('ul').children).forEach(function (el) {
                if (!subObj.children) {
                    subObj.children = [];
                }
                subObj.children.push(_this._buildJsonDS(el));
            });
        }
        return subObj;
    };
    OrgChart.prototype._attachRel = function (data, flags) {
        data.relationship = flags + (data.children && data.children.length > 0 ? 1 : 0);
        if (data.children) {
            for (var _i = 0, _a = data.children; _i < _a.length; _i++) {
                var item = _a[_i];
                this._attachRel(item, '1' + (data.children.length > 1 ? 1 : 0));
            }
        }
        return data;
    };
    OrgChart.prototype._repaint = function (node) {
        if (node) {
            node.style.offsetWidth = node.offsetWidth;
        }
    };
    OrgChart.prototype._isInAction = function (node) {
        var localNode = this._getQuerySelectorScope(node, 'className', 'edge');
        return localNode.className.indexOf('fa-') > -1;
    };
    OrgChart.prototype._getNodeState = function (node, relation) {
        var _this = this;
        var criteria;
        var state = { exist: false, visible: false };
        if (relation === 'parent') {
            criteria = this._closest(node, function (el) { return el.classList && el.classList.contains('nodes'); });
            if (criteria) {
                state.exist = true;
            }
            if (state.exist && this._isVisible(criteria.parentNode.children[0])) {
                state.visible = true;
            }
        }
        else if (relation === 'children') {
            criteria = this._closest(node, function (el) { return el.nodeName === 'TR'; }).nextElementSibling;
            if (criteria) {
                state.exist = true;
            }
            if (state.exist && this._isVisible(criteria)) {
                state.visible = true;
            }
        }
        else if (relation === 'siblings') {
            criteria = this._siblings(this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).parentNode);
            if (criteria.length) {
                state.exist = true;
            }
            if (state.exist && criteria.some(function (el) { return _this._isVisible(el); })) {
                state.visible = true;
            }
        }
        return state;
    };
    OrgChart.prototype._getQuerySelectorScope = function (el, typeName, typeNameComparator) {
        var elm;
        Array.prototype.reduce.call(el.children, function (acc, e) {
            if (e[typeName].indexOf(typeNameComparator) !== -1) {
                elm = e;
            }
            return false;
        }, []);
        return elm;
    };
    OrgChart.prototype._getQuerySelectorAllScope = function (el, typeName, typeNameComparator, isEqual) {
        if (isEqual === void 0) { isEqual = true; }
        var elm = [];
        Array.prototype.reduce.call(el.children, function (acc, e) {
            if (isEqual) {
                if (e[typeName].indexOf(typeNameComparator) !== -1) {
                    elm.push(e);
                }
            }
            else {
                if (e[typeName].indexOf(typeNameComparator) === -1) {
                    elm.push(e);
                }
            }
            return false;
        }, []);
        return elm;
    };
    OrgChart.prototype._removeFocusedNodes = function () {
        var focused = document.querySelectorAll('.focused');
        if (focused.length > 0) {
            for (var index = 0, len = focused.length; index < len; index++) {
                if (focused && typeof focused === 'object') {
                    focused[index].classList.remove('focused');
                }
            }
        }
    };
    OrgChart.prototype.getRelatedNodes = function (node, relation) {
        if (relation === 'parent') {
            return this._closest(node, function (el) { return el.classList.contains('nodes'); })
                .parentNode.children[0].querySelector('.node');
        }
        else if (relation === 'children') {
            return Array.from(this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).lastChild.children)
                .map(function (el) { return el.querySelector('.node'); });
        }
        else if (relation === 'siblings') {
            return this._siblings(this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).parentNode)
                .map(function (el) { return el.querySelector('.node'); });
        }
        return [];
    };
    OrgChart.prototype._switchHorizontalArrow = function (node) {
        var opts = this.options;
        var leftEdge = node.querySelector('.leftEdge');
        var rightEdge = node.querySelector('.rightEdge');
        var temp = this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).parentNode;
        if (opts.toggleSiblingsResp && (typeof opts.ajaxURL === 'undefined' ||
            this._closest(node, function (el) { return el.classList.contains('.nodes'); }).dataset.siblingsLoaded)) {
            var prevSib = temp.previousElementSibling;
            var nextSib = temp.nextElementSibling;
            if (prevSib) {
                if (prevSib.classList.contains('hidden')) {
                    leftEdge.classList.add('fa-chevron-left');
                    leftEdge.classList.remove('fa-chevron-right');
                }
                else {
                    leftEdge.classList.add('fa-chevron-right');
                    leftEdge.classList.remove('fa-chevron-left');
                }
            }
            if (nextSib) {
                if (nextSib.classList.contains('hidden')) {
                    rightEdge.classList.add('fa-chevron-right');
                    rightEdge.classList.remove('fa-chevron-left');
                }
                else {
                    rightEdge.classList.add('fa-chevron-left');
                    rightEdge.classList.remove('fa-chevron-right');
                }
            }
        }
        else {
            var sibs = this._siblings(temp);
            var sibsVisible = sibs.length ? !sibs.some(function (el) { return el.classList.contains('hidden'); }) : false;
            if (leftEdge) {
                leftEdge.classList.toggle('fa-chevron-right', sibsVisible);
            }
            if (leftEdge) {
                leftEdge.classList.toggle('fa-chevron-left', !sibsVisible);
            }
            if (rightEdge) {
                rightEdge.classList.toggle('fa-chevron-left', sibsVisible);
            }
            if (rightEdge) {
                rightEdge.classList.toggle('fa-chevron-right', !sibsVisible);
            }
        }
    };
    OrgChart.prototype._hoverNode = function (event) {
        var node = event.target;
        var flag = false;
        var topEdge = this._getQuerySelectorScope(node, 'className', 'topEdge');
        var bottomEdge = this._getQuerySelectorScope(node, 'className', 'bottomEdge');
        var leftEdge = this._getQuerySelectorScope(node, 'className', 'leftEdge');
        if (event.type === 'mouseenter') {
            if (topEdge) {
                flag = this._getNodeState(node, 'parent').visible;
                topEdge.classList.toggle('fa-chevron-up', !flag);
                topEdge.classList.toggle('fa-chevron-down', flag);
            }
            if (bottomEdge) {
                flag = this._getNodeState(node, 'children').visible;
                bottomEdge.classList.toggle('fa-chevron-down', !flag);
                bottomEdge.classList.toggle('fa-chevron-up', flag);
            }
            if (leftEdge) {
                this._switchHorizontalArrow(node);
            }
        }
        else {
            var edges = this._getQuerySelectorAllScope(node, 'className', 'edge');
            Array.from(edges).forEach(function (el) {
                el.classList.remove('fa-chevron-up');
                el.classList.remove('fa-chevron-down');
                el.classList.remove('fa-chevron-right');
                el.classList.remove('fa-chevron-left');
            });
        }
    };
    OrgChart.prototype._clickNode = function (event) {
        var clickedNode = event.currentTarget;
        var focusedNode = this.chart.querySelector('.focused');
        this._removeFocusedNodes();
        clickedNode.classList.add('focused');
    };
    OrgChart.prototype._buildParentNode = function (currentRoot, nodeData, callback) {
        var _this = this;
        var table = document.createElement('table');
        nodeData.relationship = nodeData.relationship || '001';
        this._createNode(nodeData, 0)
            .then(function (nodeDiv) {
            var chart = _this.chart;
            nodeDiv.classList.remove('slide-up');
            nodeDiv.classList.add('slide-down');
            var parentTr = document.createElement('tr');
            var superiorLine = document.createElement('tr');
            var inferiorLine = document.createElement('tr');
            var childrenTr = document.createElement('tr');
            parentTr.setAttribute('class', 'hidden');
            parentTr.innerHTML = "<td colspan=\"2\"></td>";
            table.appendChild(parentTr);
            superiorLine.setAttribute('class', 'lines hidden');
            superiorLine.innerHTML = "<td colspan=\"2\"><div class=\"downLine\"></div></td>";
            table.appendChild(superiorLine);
            inferiorLine.setAttribute('class', 'lines hidden');
            inferiorLine.innerHTML = "<td class=\"rightLine\">&nbsp;</td><td class=\"leftLine\">&nbsp;</td>";
            table.appendChild(inferiorLine);
            childrenTr.setAttribute('class', 'nodes');
            childrenTr.innerHTML = "<td colspan=\"2\"></td>";
            table.appendChild(childrenTr);
            table.querySelector('td').appendChild(nodeDiv);
            chart.insertBefore(table, chart.children[0]);
            table.children[3].children[0].appendChild(chart.lastChild);
            callback();
        })
            .catch(function (err) {
            console.error('Failed to create parent node', err);
        });
    };
    OrgChart.prototype._switchVerticalArrow = function (arrow) {
        arrow.classList.toggle('fa-chevron-up');
        arrow.classList.toggle('fa-chevron-down');
    };
    OrgChart.prototype.showParent = function (node) {
        var _this = this;
        var temp = this._prevAll(this._closest(node, function (el) { return el.classList.contains('nodes'); }));
        this._removeClass(node, 'collapsed');
        this._addClass(node, 'expanded');
        this._removeClass(temp, 'hidden');
        this._addClass(Array(temp[0].children).slice(1, -1), 'hidden');
        var parent = temp[2].querySelector('.node');
        this._one(parent, 'transitionend', function () {
            parent.classList.remove('slide');
            if (_this._isInAction(node)) {
                var topArrow = _this._getQuerySelectorScope(node, 'className', 'topEdge');
                _this._switchVerticalArrow(topArrow);
                _this.repositionChart(node);
            }
        }, this);
        this._repaint(parent);
        parent.classList.add('slide');
        parent.classList.remove('slide-down');
        this._removeFocusedNodes();
        this._addClass(node, 'focused');
    };
    OrgChart.prototype.showSiblings = function (node, direction) {
        var _this = this;
        var siblings = [];
        var temp = this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).parentNode;
        this._removeClass(node, 'collapsed');
        this._addClass(node, 'expanded');
        this._removeFocusedNodes();
        this._addClass(node, 'focused');
        if (direction) {
            siblings = direction === 'left' ? this._prevAll(temp) : this._nextAll(temp);
        }
        else {
            siblings = this._siblings(temp);
        }
        this._removeClass(siblings, 'hidden');
        var upperLevel = this._prevAll(this._closest(node, function (el) { return el.classList.contains('nodes'); }));
        var hiddenUpperLevel = this._getQuerySelectorAllScope(upperLevel[0], 'className', 'hidden');
        temp = Array.from(hiddenUpperLevel);
        if (direction) {
            this._removeClass(temp.slice(0, siblings.length * 2), 'hidden');
        }
        else {
            this._removeClass(temp, 'hidden');
        }
        if (!this._getNodeState(node, 'parent').visible) {
            this._removeClass(upperLevel, 'hidden');
            var parent_1 = upperLevel[2].querySelector('.node');
            this._one(parent_1, 'transitionend', function (event) {
                event.target.classList.remove('slide');
            }, this);
            this._repaint(parent_1);
            parent_1.classList.add('slide');
            parent_1.classList.remove('slide-down');
        }
        siblings.forEach(function (sib) {
            Array.from(sib.querySelectorAll('.node')).forEach(function (innerNode) {
                if (_this._isVisible(innerNode)) {
                    innerNode.classList.add('slide');
                    innerNode.classList.remove('slide-left');
                    innerNode.classList.remove('slide-right');
                }
            });
        });
        this._one(siblings[0].querySelector('.slide'), 'transitionend', function () {
            siblings.forEach(function (sib) {
                _this._removeClass(Array.from(sib.querySelectorAll('.slide')), 'slide');
            });
            if (_this._isInAction(node)) {
                _this._switchHorizontalArrow(node);
                node.querySelector('.topEdge').classList.remove('fa-chevron-up');
                node.querySelector('.topEdge').classList.add('fa-chevron-down');
            }
            _this.repositionChart(node);
        }, this);
    };
    OrgChart.prototype.hideSiblings = function (node, direction) {
        var _this = this;
        var nodeContainer = this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).parentNode;
        var siblings = this._siblings(nodeContainer);
        this._addClass(node, 'collapsed');
        this._removeFocusedNodes();
        this._addClass(node, 'focused');
        this._removeClass(node, 'expanded');
        siblings.forEach(function (sib) {
            if (sib.querySelector('.spinner')) {
                _this.chart.dataset.inAjax = false;
            }
        });
        if (!direction || (direction && direction === 'left')) {
            var preSibs = this._prevAll(nodeContainer);
            preSibs.forEach(function (sib) {
                Array.from(sib.querySelectorAll('.node')).forEach(function (innerNode) {
                    if (_this._isVisible(innerNode)) {
                        innerNode.classList.add('slide');
                        innerNode.classList.add('slide-right');
                    }
                });
            });
        }
        if (!direction || (direction && direction !== 'left')) {
            var nextSibs = this._nextAll(nodeContainer);
            nextSibs.forEach(function (sib) {
                Array.from(sib.querySelectorAll('.node')).forEach(function (innerNode) {
                    if (_this._isVisible(innerNode)) {
                        innerNode.classList.add('slide');
                        innerNode.classList.add('slide-left');
                    }
                });
            });
        }
        var animatedNodes = [];
        this._siblings(nodeContainer).forEach(function (sib) {
            Array.prototype.push.apply(animatedNodes, Array.from(sib.querySelectorAll('.slide')));
        });
        var lines = [];
        for (var _i = 0, animatedNodes_1 = animatedNodes; _i < animatedNodes_1.length; _i++) {
            var innerNode = animatedNodes_1[_i];
            var temp = this._closest(innerNode, function (el) {
                return el.classList.contains('nodes');
            }).previousElementSibling;
            lines.push(temp);
            lines.push(temp.previousElementSibling);
        }
        lines = lines.filter(function (value, index, arr) {
            return arr.indexOf(value) === index;
        });
        lines.forEach(function (line) { line.style.visibility = 'hidden'; });
        this._one(animatedNodes[0], 'transitionend', function (event) {
            lines.forEach(function (line) {
                line.removeAttribute('style');
            });
            var sibs = [];
            if (direction) {
                if (direction === 'left') {
                    sibs = _this._prevAll(nodeContainer, ':not(.hidden)');
                }
                else {
                    sibs = _this._nextAll(nodeContainer, ':not(.hidden)');
                }
            }
            else {
                sibs = _this._siblings(nodeContainer);
            }
            var tempClosest = _this._closest(nodeContainer, function (el) {
                return el.classList.contains('nodes');
            }).previousElementSibling;
            var tempClosestSelectors = _this._getQuerySelectorAllScope(tempClosest, 'className', 'hidden', false);
            var temp = Array.from(tempClosestSelectors);
            var someLines = temp.slice(1, direction ? sibs.length * 2 + 1 : -1);
            _this._addClass(someLines, 'hidden');
            _this._removeClass(animatedNodes, 'slide');
            sibs.forEach(function (sib) {
                Array.from(sib.querySelectorAll('.node')).slice(1).forEach(function (innerNode) {
                    if (_this._isVisible(innerNode)) {
                        innerNode.classList.remove('slide-left', 'slide-right');
                        innerNode.classList.add('slide-up');
                    }
                });
            });
            sibs.forEach(function (sib) {
                _this._addClass(Array.from(sib.querySelectorAll('.lines')), 'hidden');
                _this._addClass(Array.from(sib.querySelectorAll('.nodes')), 'hidden');
                _this._addClass(Array.from(sib.querySelectorAll('.verticalNodes')), 'hidden');
            });
            _this._addClass(sibs, 'hidden');
            if (_this._isInAction(node)) {
                _this._switchHorizontalArrow(node);
            }
            _this.repositionChart(node);
        }, this);
    };
    OrgChart.prototype.hideParent = function (node) {
        var _this = this;
        if (!this.currentNode) {
            this.currentNode = node;
        }
        var temp = Array.from(this._closest(node, function (el) {
            return el.classList.contains('nodes');
        }).parentNode.children).slice(0, 3);
        this._addClass(node, 'collapsed');
        this._removeFocusedNodes();
        this._addClass(node, 'focused');
        this._removeClass(node, 'expanded');
        if (temp[0].querySelector('.spinner')) {
            this.chart.dataset.inAjax = false;
        }
        if (this._getNodeState(node, 'siblings').visible) {
            this.hideSiblings(node);
        }
        var lines = temp.slice(1);
        this._css(lines, 'visibility', 'hidden');
        var parent = temp[0].querySelector('.node');
        var grandfatherVisible = this._getNodeState(parent, 'parent').visible;
        if (parent && this._isVisible(parent)) {
            parent.classList.add('slide');
            parent.classList.add('slide-down');
            this._one(parent, 'transitionend', function () {
                parent.classList.remove('slide');
                _this._removeAttr(lines, 'style');
                _this._addClass(temp, 'hidden');
                _this.repositionChart(_this.currentNode);
                if (parent && grandfatherVisible) {
                    _this.hideParent(parent);
                }
                else {
                    _this.currentNode = null;
                }
            }, this);
        }
    };
    OrgChart.prototype.addParent = function (currentRoot, data) {
        var _this = this;
        this._buildParentNode(currentRoot, data, function () {
            var topEgdeCheck = _this._getQuerySelectorScope(currentRoot, 'className', 'topEdge');
            if (!topEgdeCheck) {
                var topEdge = document.createElement('i');
                topEdge.setAttribute('class', 'edge verticalEdge topEdge fa');
                currentRoot.appendChild(topEdge);
            }
            _this.showParent(currentRoot);
        });
    };
    OrgChart.prototype._startLoading = function (arrow, node) {
        var opts = this.options;
        var chart = this.chart;
        if (typeof chart.dataset.inAjax !== 'undefined' && chart.dataset.inAjax === 'true') {
            return false;
        }
        arrow.classList.add('hidden');
        var spinner = document.createElement('i');
        spinner.setAttribute('class', 'fa fa-circle-o-notch fa-spin spinner');
        node.appendChild(spinner);
        var allElmsButSpinner = this._getQuerySelectorAllScope(node, 'className', 'spinner', false);
        this._addClass(Array.from(allElmsButSpinner), 'hazy');
        chart.dataset.inAjax = true;
        var exportBtn = this.chartContainer.querySelector('.oc-export-btn' +
            (opts.chartClass !== '' ? '.' + opts.chartClass : ''));
        if (exportBtn) {
            exportBtn.disabled = true;
        }
        return true;
    };
    OrgChart.prototype._endLoading = function (arrow, node) {
        var opts = this.options;
        arrow.classList.remove('hidden');
        var spinner = this._getQuerySelectorScope(node, 'className', 'spinner');
        node.removeChild(spinner);
        var hazyElm = this._getQuerySelectorAllScope(node, 'className', 'hazy');
        this._removeClass(Array.from(hazyElm), 'hazy');
        this.chart.dataset.inAjax = false;
        var exportBtn = this.chartContainer.querySelector('.oc-export-btn' +
            (opts.chartClass !== '' ? '.' + opts.chartClass : ''));
        if (exportBtn) {
            exportBtn.disabled = false;
        }
    };
    OrgChart.prototype._clickTopEdge = function (event) {
        var _this = this;
        event.stopPropagation();
        var topEdge = event.target;
        var node = topEdge.parentNode;
        var parentState = this._getNodeState(node, 'parent');
        var opts = this.options;
        if (parentState.exist) {
            var temp = this._closest(node, function (el) {
                return el.classList.contains('nodes');
            });
            var parent_2 = temp.parentNode.firstChild.querySelector('.node');
            if (parent_2.classList.contains('slide')) {
                return;
            }
            if (parentState.visible) {
                this.hideParent(node);
                this._one(parent_2, 'transitionend', function () {
                    if (_this._isInAction(node)) {
                        _this._switchVerticalArrow(topEdge);
                        _this._switchHorizontalArrow(node);
                        _this.repositionChart(node);
                    }
                }, this);
            }
            else {
                this.showParent(node);
            }
        }
        else {
            var nodeId = topEdge.parentNode.id;
            if (this._startLoading(topEdge, node)) {
                this._getJSON(typeof opts.ajaxURL.parent === 'function' ?
                    opts.ajaxURL.parent(node.dataset.source) : opts.ajaxURL.parent + nodeId)
                    .then(function (resp) {
                    if (_this.chart.dataset.inAjax === 'true') {
                        if (Object.keys(resp).length) {
                            _this.addParent(node, resp);
                        }
                    }
                    _this._endLoading(topEdge, node);
                })
                    .catch(function (err) {
                    console.error('Failed to get parent node data.', err);
                });
            }
        }
    };
    OrgChart.prototype.hideChildren = function (node, deleteEl) {
        var _this = this;
        var temp = this._nextAll(node.parentNode.parentNode);
        var lastItem = temp[temp.length - 1];
        var lines = [];
        this._addClass(node, 'collapsed');
        this._removeClass(node, 'expanded');
        if (lastItem.querySelector('.spinner')) {
            this.chart.dataset.inAjax = false;
        }
        var descendants = Array.from(lastItem.querySelectorAll('.node')).filter(function (el) { return _this._isVisible(el); });
        var isVerticalDesc = lastItem.classList.contains('verticalNodes');
        if (!isVerticalDesc) {
            descendants.forEach(function (desc) {
                Array.prototype.push.apply(lines, _this._prevAll(_this._closest(desc, function (el) { return el.classList.contains('nodes'); }), '.lines'));
            });
            lines = lines.filter(function (value, index, arr) {
                return arr.indexOf(value) === index;
            });
            this._css(lines, 'visibility', 'hidden');
        }
        this._one(descendants[0], 'transitionend', function (event) {
            _this._removeClass(descendants, 'slide');
            if (isVerticalDesc) {
                _this._addClass(temp, 'hidden');
                if (deleteEl) {
                    for (var i = temp.length - 1; i >= 0; i--) {
                        var childNode = temp[i];
                        childNode.parentNode.removeChild(childNode);
                    }
                }
            }
            else {
                lines.forEach(function (el) {
                    el.removeAttribute('style');
                    el.classList.add('hidden');
                    el.parentNode.lastChild.classList.add('hidden');
                });
                _this._addClass(Array.from(lastItem.querySelectorAll('.verticalNodes')), 'hidden');
                if (deleteEl) {
                    for (var i = lastItem.parentNode.getElementsByClassName('lines').length - 1; i >= 0; i--) {
                        var childNode = lastItem.parentNode.getElementsByClassName('lines')[i];
                        childNode.parentNode.removeChild(childNode);
                    }
                    for (var i = lastItem.parentNode.getElementsByClassName('nodes').length - 1; i >= 0; i--) {
                        var childNode = lastItem.parentNode.getElementsByClassName('nodes')[i];
                        childNode.parentNode.removeChild(childNode);
                    }
                }
            }
            if (_this._isInAction(node)) {
                _this._switchVerticalArrow(node.querySelector('.bottomEdge'));
            }
            _this.repositionChart(node);
        }, this);
        this._addClass(descendants, 'slide slide-up');
        this._removeFocusedNodes();
        this._addClass(node, 'focused');
    };
    OrgChart.prototype.showChildren = function (node) {
        var _this = this;
        var temp = this._nextAll(node.parentNode.parentNode);
        var descendants = [];
        this._removeClass(node, 'collapsed');
        this._addClass(node, 'expanded');
        this._removeClass(temp, 'hidden');
        if (temp.some(function (el) { return el.classList.contains('verticalNodes'); })) {
            temp.forEach(function (el) {
                Array.prototype.push.apply(descendants, Array.from(el.querySelectorAll('.node')).filter(function (innerEl) {
                    return _this._isVisible(innerEl);
                }));
            });
        }
        else {
            Array.from(temp[2].children).forEach(function (el) {
                Array.prototype.push.apply(descendants, Array.from(el.querySelector('tr').querySelectorAll('.node')).filter(function (innerEl) {
                    return _this._isVisible(innerEl);
                }));
            });
        }
        this._repaint(descendants[0]);
        this._one(descendants[0], 'transitionend', function (event) {
            _this._removeClass(descendants, 'slide');
            if (_this._isInAction(node)) {
                _this._switchVerticalArrow(node.querySelector('.bottomEdge'));
            }
            ;
            _this.repositionChart(node);
        }, this);
        this._addClass(descendants, 'slide');
        this._removeFocusedNodes();
        this._addClass(node, 'focused');
        this._removeClass(descendants, 'slide-up');
    };
    OrgChart.prototype._buildChildNode = function (appendTo, nodeData, callback) {
        var data = nodeData.children || nodeData.siblings;
        appendTo.querySelector('td').setAttribute('colSpan', data.length * 2);
        this.buildHierarchy(appendTo, { children: data }, 0, callback);
    };
    OrgChart.prototype.addChildren = function (node, data) {
        var _this = this;
        var opts = this.options;
        var count = 0;
        this.chart.dataset.inEdit = 'addChildren';
        this._buildChildNode.call(this, this._closest(node, function (el) { return el.nodeName === 'TABLE'; }), data, function () {
            if (++count === data.children.length) {
                if (!node.querySelector('.bottomEdge')) {
                    var bottomEdge = document.createElement('i');
                    bottomEdge.setAttribute('class', 'edge verticalEdge bottomEdge fa');
                    node.appendChild(bottomEdge);
                }
                if (!node.querySelector('.symbol')) {
                    var symbol = document.createElement('i');
                    symbol.setAttribute('class', 'fa ' + opts.parentNodeSymbol + ' symbol');
                    var titleElm = _this._getQuerySelectorScope(node, 'className', 'title');
                    titleElm.appendChild(symbol);
                }
                _this.showChildren(node);
                _this.chart.dataset.inEdit = '';
            }
        });
    };
    OrgChart.prototype._clickBottomEdge = function (event) {
        var _this = this;
        event.stopPropagation();
        var opts = this.options;
        var bottomEdge = event.target;
        var node = bottomEdge.parentNode;
        var childrenState = this._getNodeState(node, 'children');
        if (!opts.ajaxURL) {
            if (childrenState.exist) {
                var temp = this._closest(node, function (el) {
                    return el.nodeName === 'TR';
                }).parentNode.lastChild;
                if (Array.from(temp.querySelectorAll('.node')).some(function (innerNode) {
                    return _this._isVisible(innerNode) && innerNode.classList.contains('slide');
                })) {
                    return;
                }
                if (childrenState.visible) {
                    this.hideChildren(node);
                }
                else {
                    this.showChildren(node);
                }
            }
        }
        else {
            if (childrenState.visible) {
                this.hideChildren(node, true);
            }
            else {
                var nodeId = bottomEdge.parentNode.id;
                if (this._startLoading(bottomEdge, node)) {
                    this._getJSON(typeof opts.ajaxURL.children === 'function' ?
                        opts.ajaxURL.children(node.dataset.source) : opts.ajaxURL.children + nodeId)
                        .then(function (resp) {
                        if (_this.chart.dataset.inAjax === 'true') {
                            if (resp.children && resp.children.length) {
                                _this.addChildren(node, resp);
                            }
                            else {
                                var hazyElm = _this._getQuerySelectorAllScope(node, 'className', 'hazy');
                                _this._removeClass(Array.from(hazyElm), 'hazy');
                            }
                        }
                        _this._endLoading(bottomEdge, node);
                    })
                        .catch(function (err) {
                        console.error('Failed to get children nodes data', err);
                    });
                }
            }
        }
    };
    OrgChart.prototype._complementLine = function (oneSibling, siblingCount, existingSibligCount) {
        var temp = oneSibling.parentNode.parentNode.children;
        temp[0].children[0].setAttribute('colspan', siblingCount * 2);
        temp[1].children[0].setAttribute('colspan', siblingCount * 2);
        for (var i = 0; i < existingSibligCount; i++) {
            var rightLine = document.createElement('td');
            var leftLine = document.createElement('td');
            rightLine.setAttribute('class', 'rightLine topLine');
            rightLine.innerHTML = '&nbsp;';
            temp[2].insertBefore(rightLine, temp[2].children[1]);
            leftLine.setAttribute('class', 'leftLine topLine');
            leftLine.innerHTML = '&nbsp;';
            temp[2].insertBefore(leftLine, temp[2].children[1]);
        }
    };
    OrgChart.prototype._buildSiblingNode = function (nodeChart, nodeData, callback) {
        var _this = this;
        var newSiblingCount = nodeData.siblings ? nodeData.siblings.length : nodeData.children.length;
        var existingSibligCount = nodeChart.parentNode.nodeName === 'TD' ? this._closest(nodeChart, function (el) {
            return el.nodeName === 'TR';
        }).children.length : 1;
        var siblingCount = existingSibligCount + newSiblingCount;
        var insertPostion = (siblingCount > 1) ? Math.floor(siblingCount / 2 - 1) : 0;
        if (nodeChart.parentNode.nodeName === 'TD') {
            var temp = this._prevAll(nodeChart.parentNode.parentNode);
            temp[0].remove();
            temp[1].remove();
            var childCount_1 = 0;
            this._buildChildNode.call(this, this._closest(nodeChart.parentNode, function (el) { return el.nodeName === 'TABLE'; }), nodeData, function () {
                if (++childCount_1 === newSiblingCount) {
                    var siblingTds_1 = Array.from(_this._closest(nodeChart.parentNode, function (el) { return el.nodeName === 'TABLE'; })
                        .lastChild.children);
                    if (existingSibligCount > 1) {
                        var innerTemp = nodeChart.parentNode.parentNode;
                        Array.from(innerTemp.children).forEach(function (el) {
                            siblingTds_1[0].parentNode.insertBefore(el, siblingTds_1[0]);
                        });
                        innerTemp.remove();
                        _this._complementLine(siblingTds_1[0], siblingCount, existingSibligCount);
                        _this._addClass(siblingTds_1, 'hidden');
                        siblingTds_1.forEach(function (el) {
                            var nodes = Array.prototype.slice.call(el.querySelectorAll('.node'), 0);
                            _this._addClass(nodes, 'slide-left');
                        });
                    }
                    else {
                        var innerTemp = nodeChart.parentNode.parentNode;
                        siblingTds_1[insertPostion].parentNode.insertBefore(nodeChart.parentNode, siblingTds_1[insertPostion + 1]);
                        innerTemp.remove();
                        _this._complementLine(siblingTds_1[insertPostion], siblingCount, 1);
                        _this._addClass(siblingTds_1, 'hidden');
                        _this._addClass(_this._getDescElements(siblingTds_1.slice(0, insertPostion + 1), '.node'), 'slide-right');
                        _this._addClass(_this._getDescElements(siblingTds_1.slice(insertPostion + 1), '.node'), 'slide-left');
                    }
                    callback();
                }
            });
        }
        else {
            var nodeCount_1 = 0;
            this.buildHierarchy.call(this, this.chart, nodeData, 0, function () {
                if (++nodeCount_1 === siblingCount) {
                    var temp = nodeChart.nextElementSibling.children[3]
                        .children[insertPostion];
                    var td = document.createElement('td');
                    td.setAttribute('colspan', '2');
                    td.appendChild(nodeChart);
                    temp.parentNode.insertBefore(td, temp.nextElementSibling);
                    _this._complementLine(temp, siblingCount, 1);
                    var temp2 = _this._closest(nodeChart, function (el) { return el.classList && el.classList.contains('nodes'); })
                        .parentNode.children[0];
                    temp2.classList.add('hidden');
                    _this._addClass(Array.from(temp2.querySelectorAll('.node')), 'slide-down');
                    var temp3 = _this._siblings(nodeChart.parentNode);
                    _this._addClass(temp3, 'hidden');
                    _this._addClass(_this._getDescElements(temp3.slice(0, insertPostion), '.node'), 'slide-right');
                    _this._addClass(_this._getDescElements(temp3.slice(insertPostion), '.node'), 'slide-left');
                    callback();
                }
            });
        }
    };
    OrgChart.prototype.addSiblings = function (node, data) {
        var _this = this;
        this.chart.dataset.inEdit = 'addSiblings';
        this._buildSiblingNode.call(this, this._closest(node, function (el) { return el.nodeName === 'TABLE'; }), data, function () {
            _this._closest(node, function (el) { return el.classList && el.classList.contains('nodes'); })
                .dataset.siblingsLoaded = true;
            if (!node.querySelector('.leftEdge')) {
                var rightEdge = document.createElement('i');
                var leftEdge = document.createElement('i');
                rightEdge.setAttribute('class', 'edge horizontalEdge rightEdge fa');
                node.appendChild(rightEdge);
                leftEdge.setAttribute('class', 'edge horizontalEdge leftEdge fa');
                node.appendChild(leftEdge);
            }
            _this.showSiblings(node);
            _this.chart.dataset.inEdit = '';
        });
    };
    OrgChart.prototype.removeNodes = function (node) {
        var parent = this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).parentNode;
        var sibs = this._siblings(parent.parentNode);
        if (parent.nodeName === 'TD') {
            if (this._getNodeState(node, 'siblings').exist) {
                sibs[2].querySelector('.topLine').nextElementSibling.remove();
                sibs[2].querySelector('.topLine').remove();
                sibs[0].children[0].setAttribute('colspan', sibs[2].children.length);
                sibs[1].children[0].setAttribute('colspan', sibs[2].children.length);
                parent.remove();
            }
            else {
                sibs[0].children[0].removeAttribute('colspan');
                sibs[0].querySelector('.bottomEdge').remove();
                this._siblings(sibs[0]).forEach(function (el) { return el.remove(); });
            }
        }
        else {
            Array.from(parent.parentNode.children).forEach(function (el) { return el.remove(); });
        }
    };
    OrgChart.prototype._clickHorizontalEdge = function (event) {
        var _this = this;
        event.stopPropagation();
        var opts = this.options;
        var hEdge = event.target;
        var node = hEdge.parentNode;
        var siblingsState = this._getNodeState(node, 'siblings');
        if (siblingsState.exist) {
            var temp = this._closest(node, function (el) {
                return el.nodeName === 'TABLE';
            }).parentNode;
            var siblings = this._siblings(temp);
            if (siblings.some(function (el) {
                var innerNode = el.querySelector('.node');
                return _this._isVisible(innerNode) && innerNode.classList.contains('slide');
            })) {
                return;
            }
            if (opts.toggleSiblingsResp) {
                var prevSib = this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).parentNode.previousElementSibling;
                var nextSib = this._closest(node, function (el) { return el.nodeName === 'TABLE'; }).parentNode.nextElementSibling;
                if (hEdge.classList.contains('leftEdge')) {
                    if (prevSib.classList.contains('hidden')) {
                        this.showSiblings(node, 'left');
                    }
                    else {
                        this.hideSiblings(node, 'left');
                    }
                }
                else {
                    if (nextSib.classList.contains('hidden')) {
                        this.showSiblings(node, 'right');
                    }
                    else {
                        this.hideSiblings(node, 'right');
                    }
                }
            }
            else {
                if (siblingsState.visible) {
                    this.hideSiblings(node);
                }
                else {
                    this.showSiblings(node);
                }
            }
        }
        else {
            var nodeId = hEdge.parentNode.id;
            var url = (this._getNodeState(node, 'parent').exist) ?
                (typeof opts.ajaxURL.siblings === 'function' ?
                    opts.ajaxURL.siblings(JSON.parse(node.dataset.source)) : opts.ajaxURL.siblings + nodeId) :
                (typeof opts.ajaxURL.families === 'function' ?
                    opts.ajaxURL.families(JSON.parse(node.dataset.source)) : opts.ajaxURL.families + nodeId);
            if (this._startLoading(hEdge, node)) {
                this._getJSON(url)
                    .then(function (resp) {
                    if (_this.chart.dataset.inAjax === 'true') {
                        if (resp.siblings || resp.children) {
                            _this.addSiblings(node, resp);
                        }
                    }
                    _this._endLoading(hEdge, node);
                })
                    .catch(function (err) {
                    console.error('Failed to get sibling nodes data', err);
                });
            }
        }
    };
    OrgChart.prototype._clickToggleButton = function (event) {
        var _this = this;
        var toggleBtn = event.target;
        var descWrapper = toggleBtn.parentNode.nextElementSibling;
        var descendants = Array.from(descWrapper.querySelectorAll('.node'));
        var children = Array.from(descWrapper.children).map(function (item) { return item.querySelector('.node'); });
        if (children.some(function (item) { return item.classList.contains('slide'); })) {
            return;
        }
        toggleBtn.classList.toggle('fa-plus-square');
        toggleBtn.classList.toggle('fa-minus-square');
        if (descendants[0].classList.contains('slide-up')) {
            descWrapper.classList.remove('hidden');
            this._repaint(children[0]);
            this._addClass(children, 'slide');
            this._removeClass(children, 'slide-up');
            this._one(children[0], 'transitionend', function () {
                _this._removeClass(children, 'slide');
            });
        }
        else {
            this._addClass(descendants, 'slide slide-up');
            this._one(descendants[0], 'transitionend', function () {
                _this._removeClass(descendants, 'slide');
                descendants.forEach(function (desc) {
                    var ul = _this._closest(desc, function (el) {
                        return el.nodeName === 'UL';
                    });
                    ul.classList.add('hidden');
                });
            });
            descendants.forEach(function (desc) {
                var subTBs = Array.from(desc.querySelectorAll('.toggleBtn'));
                _this._removeClass(subTBs, 'fa-minus-square');
                _this._addClass(subTBs, 'fa-plus-square');
            });
        }
    };
    OrgChart.prototype._dispatchClickEvent = function (event) {
        var classList = event.target.classList;
        if (classList.contains('topEdge')) {
            this._clickTopEdge(event);
        }
        else if (classList.contains('rightEdge') || classList.contains('leftEdge')) {
            this._clickHorizontalEdge(event);
        }
        else if (classList.contains('bottomEdge')) {
            this._clickBottomEdge(event);
        }
        else if (classList.contains('toggleBtn')) {
            this._clickToggleButton(event);
        }
        else {
            this._clickNode(event);
        }
    };
    OrgChart.prototype._onDragStart = function (event) {
        var nodeDiv = event.target;
        var opts = this.options;
        var isFirefox = /firefox/.test(window.navigator.userAgent.toLowerCase());
        if (isFirefox) {
            event.dataTransfer.setData('text/html', 'hack for firefox');
        }
        if (this.chart.style.transform) {
            var ghostNode = void 0;
            var nodeCover = void 0;
            if (!document.getElementById('ghost-node')) {
                ghostNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                ghostNode.id = 'ghost-node';
                ghostNode.classList.add('ghost-node');
                nodeCover = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                ghostNode.appendChild(nodeCover);
                this.chart.appendChild(ghostNode);
            }
            else {
                ghostNode = document.getElementById('ghost-node');
                nodeCover = ghostNode.children[0];
            }
            var transValues = this.chart.style.transform.split(',');
            var scale = Math.abs(parseFloat((opts.direction === 't2b' || opts.direction === 'b2t') ?
                transValues[0].slice(transValues[0].indexOf('(') + 1) : transValues[1]));
            ghostNode.setAttribute('width', nodeDiv.offsetWidth);
            ghostNode.setAttribute('height', nodeDiv.offsetHeight);
            nodeCover.setAttribute('x', 5 * scale);
            nodeCover.setAttribute('y', 5 * scale);
            nodeCover.setAttribute('width', 120 * scale);
            nodeCover.setAttribute('height', 40 * scale);
            nodeCover.setAttribute('rx', 4 * scale);
            nodeCover.setAttribute('ry', 4 * scale);
            nodeCover.setAttribute('stroke-width', 1 * scale);
            var xOffset = event.offsetX * scale;
            var yOffset = event.offsetY * scale;
            if (opts.direction === 'l2r') {
                xOffset = event.offsetY * scale;
                yOffset = event.offsetX * scale;
            }
            else if (opts.direction === 'r2l') {
                xOffset = nodeDiv.offsetWidth - event.offsetY * scale;
                yOffset = event.offsetX * scale;
            }
            else if (opts.direction === 'b2t') {
                xOffset = nodeDiv.offsetWidth - event.offsetX * scale;
                yOffset = nodeDiv.offsetHeight - event.offsetY * scale;
            }
            if (isFirefox) {
                var ghostNodeWrapper = document.createElement('img');
                ghostNodeWrapper.src = 'data:image/svg+xml;utf8,' + (new XMLSerializer()).serializeToString(ghostNode);
                event.dataTransfer.setDragImage(ghostNodeWrapper, xOffset, yOffset);
                nodeCover.setAttribute('fill', 'rgb(255, 255, 255)');
                nodeCover.setAttribute('stroke', 'rgb(191, 0, 0)');
            }
            else {
                event.dataTransfer.setDragImage(ghostNode, xOffset, yOffset);
            }
        }
        var dragged = event.target;
        var dragZone = this._closest(dragged, function (el) {
            return el.classList && el.classList.contains('nodes');
        }).parentNode.children[0].querySelector('.node');
        var dragHier = Array.from(this._closest(dragged, function (el) {
            return el.nodeName === 'TABLE';
        }).querySelectorAll('.node'));
        this.dragged = dragged;
        Array.from(this.chart.querySelectorAll('.node')).forEach(function (node) {
            if (!dragHier.includes(node)) {
                if (opts.dropCriteria) {
                    if (opts.dropCriteria(dragged, dragZone, node)) {
                        node.classList.add('allowedDrop');
                    }
                }
                else {
                    node.classList.add('allowedDrop');
                }
            }
        });
    };
    OrgChart.prototype._onDragOver = function (event) {
        event.preventDefault();
        var dropZone = event.currentTarget;
        if (!dropZone.classList.contains('allowedDrop')) {
            event.dataTransfer.dropEffect = 'none';
        }
    };
    OrgChart.prototype._onDragEnd = function (event) {
        Array.from(this.chart.querySelectorAll('.allowedDrop')).forEach(function (el) {
            el.classList.remove('allowedDrop');
        });
        var ghostNode = document.getElementById('ghost-node');
        ghostNode.parentNode.removeChild(ghostNode);
    };
    OrgChart.prototype._onDrop = function (event) {
        var dropZone = event.currentTarget;
        var chart = this.chart;
        var dragged = this.dragged;
        var dragZone = this._closest(dragged, function (el) {
            return el.classList && el.classList.contains('nodes');
        }).parentNode.children[0].children[0];
        this._removeClass(Array.from(chart.querySelectorAll('.allowedDrop')), 'allowedDrop');
        if (!dropZone.parentNode.parentNode.nextElementSibling) {
            var bottomEdge = document.createElement('i');
            bottomEdge.setAttribute('class', 'edge verticalEdge bottomEdge fa');
            dropZone.appendChild(bottomEdge);
            dropZone.parentNode.setAttribute('colspan', 2);
            var table = this._closest(dropZone, function (el) {
                return el.nodeName === 'TABLE';
            });
            var upperTr = document.createElement('tr');
            var lowerTr = document.createElement('tr');
            var nodeTr = document.createElement('tr');
            upperTr.setAttribute('class', 'lines');
            upperTr.innerHTML = "<td colspan=\"2\"><div class=\"downLine\"></div></td>";
            table.appendChild(upperTr);
            lowerTr.setAttribute('class', 'lines');
            lowerTr.innerHTML = "<td class=\"rightLine\">&nbsp;</td><td class=\"leftLine\">&nbsp;</td>";
            table.appendChild(lowerTr);
            nodeTr.setAttribute('class', 'nodes');
            table.appendChild(nodeTr);
            Array.from(dragged.querySelectorAll('.horizontalEdge')).forEach(function (hEdge) {
                dragged.removeChild(hEdge);
            });
            var draggedTd = this._closest(dragged, function (el) { return el.nodeName === 'TABLE'; }).parentNode;
            nodeTr.appendChild(draggedTd);
        }
        else {
            var dropColspan = parseInt(dropZone.parentNode.colSpan, 10) + 2;
            dropZone.parentNode.setAttribute('colspan', dropColspan);
            dropZone.parentNode.parentNode.nextElementSibling.children[0].setAttribute('colspan', dropColspan);
            if (!dragged.querySelector('.horizontalEdge')) {
                var rightEdge = document.createElement('i');
                var leftEdge = document.createElement('i');
                rightEdge.setAttribute('class', 'edge horizontalEdge rightEdge fa');
                dragged.appendChild(rightEdge);
                leftEdge.setAttribute('class', 'edge horizontalEdge leftEdge fa');
                dragged.appendChild(leftEdge);
            }
            var temp = dropZone.parentNode.parentNode.nextElementSibling.nextElementSibling;
            var leftline = document.createElement('td');
            var rightline = document.createElement('td');
            leftline.setAttribute('class', 'leftLine topLine');
            leftline.innerHTML = "&nbsp;";
            temp.insertBefore(leftline, temp.children[1]);
            rightline.setAttribute('class', 'rightLine topLine');
            rightline.innerHTML = "&nbsp;";
            temp.insertBefore(rightline, temp.children[2]);
            temp.nextElementSibling.appendChild(this._closest(dragged, function (el) {
                return el.nodeName === 'TABLE';
            }).parentNode);
            var dropSibs = this._siblings(this._closest(dragged, function (el) {
                return el.nodeName === 'TABLE';
            }).parentNode).map(function (el) { return el.querySelector('.node'); });
            if (dropSibs.length === 1) {
                var rightEdge = document.createElement('i');
                var leftEdge = document.createElement('i');
                rightEdge.setAttribute('class', 'edge horizontalEdge rightEdge fa');
                dropSibs[0].appendChild(rightEdge);
                leftEdge.setAttribute('class', 'edge horizontalEdge leftEdge fa');
                dropSibs[0].appendChild(leftEdge);
            }
        }
        var dragColSpan = parseInt(dragZone.colSpan, 10);
        if (dragColSpan > 2) {
            dragZone.setAttribute('colspan', dragColSpan - 2);
            dragZone.parentNode.nextElementSibling.children[0].setAttribute('colspan', dragColSpan - 2);
            var temp = dragZone.parentNode.nextElementSibling.nextElementSibling;
            temp.children[1].remove();
            temp.children[1].remove();
            var dragSibs = Array.from(dragZone.parentNode.parentNode.children[3].children).map(function (td) {
                return td.querySelector('.node');
            });
            if (dragSibs.length === 1) {
                dragSibs[0].querySelector('.leftEdge').remove();
                dragSibs[0].querySelector('.rightEdge').remove();
            }
        }
        else {
            dragZone.removeAttribute('colspan');
            dragZone.querySelector('.node').removeChild(dragZone.querySelector('.bottomEdge'));
            Array.from(dragZone.parentNode.parentNode.children).slice(1).forEach(function (tr) { return tr.remove(); });
        }
        var customE = new CustomEvent('nodedropped.orgchart', { detail: {
                draggedNode: dragged,
                dragZone: dragZone.children[0],
                dropZone: dropZone,
            } });
        chart.dispatchEvent(customE);
    };
    OrgChart.prototype._checkBrowser = function () {
        var isIE = /(Edge|MSIE)/i.test(navigator.userAgent);
        return isIE;
    };
    OrgChart.prototype._createNode = function (nodeData, level) {
        var _this = this;
        var opts = this.options;
        return new Promise(function (resolve, reject) {
            if (nodeData.children) {
                for (var _i = 0, _a = nodeData.children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    child.parentId = nodeData.id;
                }
            }
            var nodeDiv = document.createElement('div');
            delete nodeData.children;
            nodeDiv.dataset.source = JSON.stringify(nodeData);
            if (nodeData[opts.nodeId]) {
                nodeDiv.id = nodeData[opts.nodeId];
            }
            var inEdit = _this.chart.dataset.inEdit;
            var isHidden;
            if (inEdit) {
                isHidden = inEdit === 'addChildren' ? ' slide-up' : '';
            }
            else {
                isHidden = level >= opts.depth ? ' slide-up' : '';
            }
            nodeDiv.setAttribute('class', 'node ' + (nodeData.className || '') + isHidden);
            if (opts.draggable) {
                nodeDiv.setAttribute('draggable', 'true');
            }
            if (nodeData.parentId) {
                nodeDiv.setAttribute('data-parent', nodeData.parentId);
            }
            nodeDiv.innerHTML = "\n        <div class=\"title\">" + nodeData[opts.nodeTitle] + "</div>\n        " + (opts.nodeContent ? "<div class=\"content\">" + nodeData[opts.nodeContent] + "</div>" : '') + "\n      ";
            var flags = nodeData.relationship || '';
            if (opts.verticalDepth && (level + 2) > opts.verticalDepth) {
                if ((level + 1) >= opts.verticalDepth && Number(flags.substr(2, 1))) {
                    var toggleBtn = document.createElement('i');
                    var icon = level + 1 >= opts.depth ? 'plus' : 'minus';
                    toggleBtn.setAttribute('class', 'toggleBtn fa fa-' + icon + '-square');
                    nodeDiv.appendChild(toggleBtn);
                }
            }
            else {
                if (Number(flags.substr(0, 1))) {
                    var topEdge = document.createElement('i');
                    topEdge.setAttribute('class', 'edge verticalEdge topEdge fa');
                    nodeDiv.appendChild(topEdge);
                }
                if (Number(flags.substr(1, 1))) {
                    var rightEdge = document.createElement('i');
                    var leftEdge = document.createElement('i');
                    rightEdge.setAttribute('class', 'edge horizontalEdge rightEdge fa');
                    nodeDiv.appendChild(rightEdge);
                    leftEdge.setAttribute('class', 'edge horizontalEdge leftEdge fa');
                    nodeDiv.appendChild(leftEdge);
                }
                if (Number(flags.substr(2, 1))) {
                    var bottomEdge = document.createElement('i');
                    var symbol = document.createElement('i');
                    var title = _this._getQuerySelectorScope(nodeDiv, 'className', 'title');
                    bottomEdge.setAttribute('class', 'edge verticalEdge bottomEdge fa');
                    nodeDiv.appendChild(bottomEdge);
                    symbol.setAttribute('class', 'fa ' + opts.parentNodeSymbol + ' symbol');
                    title.insertBefore(symbol, title.children[0]);
                }
            }
            nodeDiv.addEventListener('mouseenter', _this._hoverNode.bind(_this));
            nodeDiv.addEventListener('mouseleave', _this._hoverNode.bind(_this));
            nodeDiv.addEventListener('click', _this._dispatchClickEvent.bind(_this));
            if (opts.draggable) {
                nodeDiv.addEventListener('dragstart', _this._onDragStart.bind(_this));
                nodeDiv.addEventListener('dragover', _this._onDragOver.bind(_this));
                nodeDiv.addEventListener('dragend', _this._onDragEnd.bind(_this));
                nodeDiv.addEventListener('drop', _this._onDrop.bind(_this));
            }
            if (opts.createNode) {
                opts.createNode(nodeDiv, nodeData);
            }
            resolve(nodeDiv);
        });
    };
    OrgChart.prototype.buildHierarchy = function (appendTo, nodeData, level, callback) {
        var _this = this;
        var opts = this.options;
        var nodeWrapper;
        var childNodes = nodeData.children;
        var isVerticalNode = opts.verticalDepth && (level + 1) >= opts.verticalDepth;
        if (Object.keys(nodeData).length > 1) {
            nodeWrapper = isVerticalNode ? appendTo : document.createElement('table');
            if (!isVerticalNode) {
                appendTo.appendChild(nodeWrapper);
            }
            this._createNode(nodeData, level)
                .then(function (nodeDiv) {
                if (isVerticalNode) {
                    nodeWrapper.insertBefore(nodeDiv, nodeWrapper.firstChild);
                }
                else {
                    var tr = document.createElement('tr');
                    tr.innerHTML = "\n            <td " + (childNodes ? "colspan=\"" + childNodes.length * 2 + "\"" : '') + ">\n            </td>\n          ";
                    tr.children[0].appendChild((nodeDiv));
                    nodeWrapper.insertBefore(tr, nodeWrapper.children[0] ? nodeWrapper.children[0] : null);
                }
                if (callback) {
                    callback();
                }
            })
                .catch(function (err) {
                console.error('Failed to creat node', err);
            });
        }
        if (childNodes) {
            if (Object.keys(nodeData).length === 1) {
                nodeWrapper = appendTo;
            }
            var isHidden = void 0;
            var isVerticalLayer_1 = opts.verticalDepth && (level + 2) >= opts.verticalDepth;
            var inEdit = this.chart.dataset.inEdit;
            if (inEdit) {
                isHidden = inEdit === 'addSiblings' ? '' : ' hidden';
            }
            else {
                isHidden = level + 1 >= opts.depth ? ' hidden' : '';
            }
            if (!isVerticalLayer_1) {
                var tr = document.createElement('tr');
                tr.setAttribute('class', 'lines' + isHidden);
                tr.innerHTML = "\n          <td colspan=\"" + childNodes.length * 2 + "\">\n            <div class=\"downLine\"></div>\n          </td>\n        ";
                nodeWrapper.appendChild(tr);
            }
            var lineLayer = document.createElement('tr');
            lineLayer.setAttribute('class', 'lines' + isHidden);
            lineLayer.innerHTML = "\n        <td class=\"rightLine\">&nbsp;</td>\n        " + childNodes.slice(1).map(function () { return "\n          <td class=\"leftLine topLine\">&nbsp;</td>\n          <td class=\"rightLine topLine\">&nbsp;</td>\n          "; }).join('') + "\n        <td class=\"leftLine\">&nbsp;</td>\n      ";
            var nodeLayer_1;
            if (isVerticalLayer_1) {
                nodeLayer_1 = document.createElement('ul');
                if (isHidden && level + 2 !== opts.verticalDepth) {
                    nodeLayer_1.classList.add(isHidden.trim());
                }
                if (level + 2 === opts.verticalDepth) {
                    var tr = document.createElement('tr');
                    tr.setAttribute('class', 'verticalNodes' + isHidden);
                    tr.innerHTML = "<td></td>";
                    tr.firstChild.appendChild(nodeLayer_1);
                    nodeWrapper.appendChild(tr);
                }
                else {
                    nodeWrapper.appendChild(nodeLayer_1);
                }
            }
            else {
                nodeLayer_1 = document.createElement('tr');
                nodeLayer_1.setAttribute('class', 'nodes' + isHidden);
                nodeWrapper.appendChild(lineLayer);
                nodeWrapper.appendChild(nodeLayer_1);
            }
            childNodes.forEach(function (child) {
                var nodeCell;
                if (isVerticalLayer_1) {
                    nodeCell = document.createElement('li');
                }
                else {
                    nodeCell = document.createElement('td');
                    nodeCell.setAttribute('colspan', 2);
                }
                nodeLayer_1.appendChild(nodeCell);
                _this.buildHierarchy(nodeCell, child, level + 1, callback);
            });
        }
    };
    OrgChart.prototype._clickChart = function (event) {
        var closestNode = this._closest(event.target, function (el) {
            return el.classList && el.classList.contains('node');
        });
        if (!closestNode && this.chart.querySelector('.node.focused')) {
            this.chart.querySelector('.node.focused').classList.remove('focused');
        }
    };
    OrgChart.prototype._clickExportButton = function () {
        var _this = this;
        var opts = this.options;
        var chartContainer = this.chartContainer;
        var mask = this._getQuerySelectorScope(chartContainer, 'className', 'mask');
        var sourceChart = chartContainer.querySelector('.orgchart:not(.hidden)>table');
        var flag = opts.direction === 'l2r' || opts.direction === 'r2l';
        if (opts && opts.exportCallback) {
            opts.exportCallback();
        }
        if (!mask) {
            mask = document.createElement('div');
            mask.setAttribute('class', 'mask');
            mask.innerHTML = "<i class=\"fa fa-circle-o-notch fa-spin spinner\"></i>";
            chartContainer.appendChild(mask);
        }
        else {
            mask.classList.remove('hidden');
        }
        chartContainer.classList.add('canvasContainer');
        this.html2canvas(sourceChart, {
            width: flag ? sourceChart.clientHeight : sourceChart.clientWidth,
            height: flag ? sourceChart.clientWidth : sourceChart.clientHeight,
            onclone: function (cloneDoc) {
                var canvasContainer = cloneDoc.querySelector('.canvasContainer');
                canvasContainer.style.overflow = 'visible';
                canvasContainer.querySelector('.orgchart:not(.hidden)').removeAttribute('style');
            },
        })
            .then(function (canvas) {
            var downloadBtn = chartContainer.querySelector('.oc-download-btn');
            chartContainer.querySelector('.mask').classList.add('hidden');
            downloadBtn.setAttribute('href', canvas.toDataURL());
            if (!_this._checkBrowser()) {
                downloadBtn.click();
            }
            else {
                window.navigator.msSaveBlob(canvas.msToBlob(), 'Orgchart.png');
            }
            chartContainer.classList.remove('canvasContainer');
            if (opts && opts.endExportCallback) {
                opts.endExportCallback();
            }
        })
            .catch(function (err) {
            console.error('Failed to export the curent orgchart!', err);
        });
    };
    OrgChart.prototype._loopChart = function (chart) {
        var _this = this;
        var subObj = { id: chart.querySelector('.node').id };
        if (chart.children[3]) {
            Array.from(chart.children[3].children).forEach(function (el) {
                if (!(subObj).children) {
                    (subObj).children = [];
                }
                (subObj).children.push(_this._loopChart((el).firstChild));
            });
        }
        return subObj;
    };
    OrgChart.prototype.getHierarchy = function () {
        if (!this.chart.querySelector('.node').id) {
            return 'Error: Nodes of orghcart to be exported must have id attribute!';
        }
        return this._loopChart(this.chart.querySelector('table'));
    };
    OrgChart.prototype._onPanStart = function (event) {
        var chart = this.chart;
        var chartContainer = event.currentTarget;
        if (this._closest(event.target, function (el) { return el.classList && el.classList.contains('node'); }) ||
            (event.touches && event.touches.length > 1)) {
            chart.dataset.panning = false;
            return;
        }
        chartContainer.style.cursor = 'move';
        chart.dataset.panning = true;
        var lastX = 0;
        var lastY = 0;
        var lastTf = window.getComputedStyle(chart).transform;
        if (lastTf !== 'none') {
            var temp = lastTf.split(',');
            if (!lastTf.includes('3d')) {
                lastX = Number.parseInt(temp[4], 10);
                lastY = Number.parseInt(temp[5], 10);
            }
            else {
                lastX = Number.parseInt(temp[12], 10);
                lastY = Number.parseInt(temp[13], 10);
            }
        }
        var startX = 0;
        var startY = 0;
        if (!event.targetTouches) {
            startX = event.pageX - lastX;
            startY = event.pageY - lastY;
        }
        else if (event.targetTouches.length === 1) {
            startX = event.targetTouches[0].pageX - lastX;
            startY = event.targetTouches[0].pageY - lastY;
        }
        else if (event.targetTouches.length > 1) {
            return;
        }
        chart.dataset.panStart = JSON.stringify({ startX: startX, startY: startY });
        chartContainer.addEventListener('mousemove', this._onPanning.bind(this));
        chartContainer.addEventListener('touchmove', this._onPanning.bind(this));
    };
    OrgChart.prototype._onPanning = function (event) {
        var chart = this.chart;
        if (chart.dataset.panning === 'false') {
            return;
        }
        var newX = 0;
        var newY = 0;
        var panStart = JSON.parse(chart.dataset.panStart);
        var startX = panStart.startX;
        var startY = panStart.startY;
        if (!event.targetTouches) {
            newX = event.pageX - startX;
            newY = event.pageY - startY;
        }
        else if (event.targetTouches.length === 1) {
            newX = event.targetTouches[0].pageX - startX;
            newY = event.targetTouches[0].pageY - startY;
        }
        else if (event.targetTouches.length > 1) {
            return;
        }
        var lastTf = window.getComputedStyle(chart).transform;
        if (lastTf === 'none') {
            if (!lastTf.includes('3d')) {
                chart.style.transform = "matrix(1, 0, 0, 1, " + newX + ", " + newY + ")";
            }
            else {
                chart.style.transform = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + newX + ', ' + newY + ', 0, 1)';
            }
        }
        else {
            var matrix = lastTf.split(',');
            if (!lastTf.includes('3d')) {
                matrix[4] = newX;
                matrix[5] = newY + ')';
            }
            else {
                matrix[12] = newX;
                matrix[13] = newY;
            }
            chart.style.transform = matrix.join(',');
        }
    };
    OrgChart.prototype._onPanEnd = function (event) {
        var chart = this.chart;
        var chartContainer = this.chartContainer;
        if (chart.dataset.panning === 'true') {
            chart.dataset.panning = false;
            chartContainer.style.cursor = 'default';
            document.body.removeEventListener('mousemove', this._onPanning);
            document.body.removeEventListener('touchmove', this._onPanning);
        }
    };
    OrgChart.prototype._setChartScale = function (chart, newScale) {
        var lastTf = window.getComputedStyle(chart).transform;
        if (lastTf === 'none') {
            chart.style.transform = 'scale(' + newScale + ',' + newScale + ')';
        }
        else {
            var matrix = lastTf.split(',');
            if (!lastTf.includes('3d')) {
                matrix[0] = 'matrix(' + newScale;
                matrix[3] = newScale;
                chart.style.transform = lastTf + ' scale(' + newScale + ',' + newScale + ')';
            }
            else {
                chart.style.transform = lastTf + ' scale3d(' + newScale + ',' + newScale + ', 1)';
            }
        }
        chart.dataset.scale = newScale;
    };
    OrgChart.prototype._onWheeling = function (event) {
        event.preventDefault();
        var newScale = event.deltaY > 0 ? 0.8 : 1.2;
        this._setChartScale(this.chart, newScale);
    };
    OrgChart.prototype._getPinchDist = function (event) {
        return Math.sqrt((event.touches[0].clientX - event.touches[1].clientX) *
            (event.touches[0].clientX - event.touches[1].clientX) +
            (event.touches[0].clientY - event.touches[1].clientY) *
                (event.touches[0].clientY - event.touches[1].clientY));
    };
    OrgChart.prototype._onTouchStart = function (event) {
        var chart = this.chart;
        if (event.touches && event.touches.length === 2) {
            var dist = this._getPinchDist(event);
            chart.dataset.pinching = true;
            chart.dataset.pinchDistStart = dist;
        }
    };
    OrgChart.prototype._onTouchMove = function (event) {
        var chart = this.chart;
        if (chart.dataset.pinching) {
            var dist = this._getPinchDist(event);
            chart.dataset.pinchDistEnd = dist;
        }
    };
    OrgChart.prototype._onTouchEnd = function (event) {
        var chart = this.chart;
        if (chart.dataset.pinching) {
            chart.dataset.pinching = false;
            var diff = chart.dataset.pinchDistEnd - chart.dataset.pinchDistStart;
            if (diff > 0) {
                this._setChartScale(chart, 1);
            }
            else if (diff < 0) {
                this._setChartScale(chart, -1);
            }
        }
    };
    OrgChart.prototype.repositionChart = function (node) {
        if (node === void 0) { node = null; }
        var reset = false;
        var zoomX = 0;
        var zoomY = 0;
        if (!node) {
            var tr = this.chart.querySelector('.orgchart > table > tr');
            if (!tr.classList.contains('hidden')) {
                node = tr.querySelector('td > .node');
            }
            if (!node) {
                tr = this.chart.querySelector('.orgchart > table > tr.nodes');
                var found = false;
                while (!found) {
                    var tmp = tr.querySelector('td:not(.hidden) > table > tr');
                    if (!tmp.classList.contains('hidden')) {
                        found = true;
                        node = tmp.querySelector('td:not(.hidden) > div.node');
                    }
                    else {
                        tr = tr.querySelector('table > tr.nodes');
                    }
                }
            }
            reset = true;
            this.chart.style.transform = '';
        }
        else {
            var matrixCopy = this.chart.style.transform.replace(/^\w*\(/, '').replace(')', '');
            var matrixValue = matrixCopy.split(/\s*,\s*/);
            zoomX = matrixValue[0];
            zoomY = matrixValue[3];
            this.chart.style.transform = "matrix(" + zoomX + ", 0, 0, " + zoomY + ", 0, 0)";
        }
        var chartContainer = document.getElementById('chart-container');
        var chartBounding = chartContainer.getBoundingClientRect();
        var nodeBounding = node.getBoundingClientRect();
        var chartHalfX = chartBounding.left + (chartBounding.width / 2);
        var chartHalfY = chartBounding.top + (chartBounding.height / 2);
        var nodeX = (nodeBounding.left + (nodeBounding.width / 2));
        var nodeY = (nodeBounding.top + (nodeBounding.height / 2));
        var newX = nodeX - chartHalfX;
        var newY = nodeY - chartHalfY;
        if (!reset) {
            this.chart.style.transform = "matrix(" + zoomX + ", 0, 0, " + zoomY + ", " + -newX + ", " + -newY + ")";
        }
        else {
            this.chart.style.transform = "matrix(1, 0, 0, 1, " + -newX + ", " + -newY + ")";
        }
    };
    OrgChart.prototype.resizeChart = function () {
        var chartContainer = document.getElementById('chart-container');
        var organigramContainer = document.getElementsByTagName('app-organigram-container');
        var marginBottom = organigramContainer[0] ? parseFloat(window.getComputedStyle(organigramContainer[0]).marginBottom) : 0;
        var chartBounding = chartContainer.getBoundingClientRect();
        var chartHeight = window.innerHeight - chartBounding.top - marginBottom;
        chartContainer.setAttribute('style', 'height: ' + chartHeight + 'px');
    };
    return OrgChart;
}());
exports.OrgChart = OrgChart;
//# sourceMappingURL=orgchart.js.map