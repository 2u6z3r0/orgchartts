import * as html2canvas from 'html2canvas';

export default class OrgChart {

  _name: any;
  options: any;
  chart: any;
  chartContainer: any;
  currentNode: any;
  dragged: any;
  html2canvas: any;

  constructor(options: any) {
    this._name = 'OrgChart';
    this.html2canvas = html2canvas;

    const defaultOptions = {
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
    const opts = Object.assign(defaultOptions, options);
    const data = opts.data;
    const chart = document.createElement('div');
    const chartContainer = document.querySelector(opts.chartContainer);

    this.options = opts;
    delete this.options.data;
    this.chart = chart;
    this.chartContainer = chartContainer;
    this.currentNode = null;
    chart.dataset.options = JSON.stringify(opts);
    chart.setAttribute('class', 'orgchart' + (opts.chartClass !== '' ? ' ' + opts.chartClass : '') +
      (opts.direction !== 't2b' ? ' ' + opts.direction : ''));
    if (typeof data === 'object') { // local json datasource
      this.buildHierarchy(chart, opts.ajaxURL ? data : this._attachRel(data, '00'), 0, () => {
        if ( opts.fullHeight ) {
          this.resizeChart();
        }
        this.repositionChart();
      });
    } else if (typeof data === 'string' && data.startsWith('#')) { // ul datasource
      this.buildHierarchy(chart, this._buildJsonDS(document.querySelector(data).children[0]), 0, () => {
        if ( opts.fullHeight ) {
          this.resizeChart();
        }
        this.repositionChart();
    });
    } else { // ajax datasource
      const spinner = document.createElement('i');

      spinner.setAttribute('class', 'fa fa-circle-o-notch fa-spin spinner');
      chart.appendChild(spinner);
      this._getJSON(data).then( (resp) => {
        this.buildHierarchy(chart, ( opts.ajaxURL ? resp : this._attachRel(resp, '00') ), 0);

        const spinnerInner = chart.querySelector('.spinner');

        spinnerInner.parentNode.removeChild(spinnerInner);
        if ( opts.fullHeight ) {
          this.resizeChart();
        }
        this.repositionChart();
      })
      .catch( (err) => {
        console.error('failed to fetch datasource for orgchart', err);
      });
    }
    chartContainer.addEventListener('click', this._clickChart.bind(this));
    window.addEventListener('resize', this.resizeChart.bind(this));
    // append the export button to the chart-container
    if (opts.exportButton && !chartContainer.querySelector('.oc-export-btn')) {
      const exportBtn = document.createElement('button');
      const downloadBtn = document.createElement('a');

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
  get name() {
    return this._name;
  }
  _closest(el: any, fn?: any) {
    return el && ((fn(el) && el !== this.chart) ? el : this._closest(el.parentNode, fn));
  }
  _siblings(el: any, expr?: any) {
    return Array.from(el.parentNode.children).filter((child) => {
      if (child !== el) {
        if (expr) {
          return el.matches(expr);
        }
        return true;
      }
      return false;
    });
  }
  _prevAll(el: any, expr?: any) {
    const sibs = [];
    let prevSib = el.previousElementSibling;

    while (prevSib) {
      if (!expr || prevSib.matches(expr)) {
        sibs.push(prevSib);
      }
      prevSib = prevSib.previousElementSibling;
    }
    return sibs;
  }
  _nextAll(el: any, expr?: any) {
    const sibs = [];
    let nextSib = el.nextElementSibling;

    while (nextSib) {
      if (!expr || nextSib.matches(expr)) {
        sibs.push(nextSib);
      }
      nextSib = nextSib.nextElementSibling;
    }
    return sibs;
  }
  _isVisible(el: any) {
    return el.offsetParent !== null;
  }
  _addClass(elements, classNames) {
    if ( elements.length ) {
      elements.forEach((el) => {
        if ( classNames.indexOf(' ') > 0 ) {
          classNames.split(' ').forEach((className) => el.classList.add(className));
        } else {
          el.classList.add(classNames);
        }
      });
    } else {
      if ( classNames.indexOf(' ') > 0 ) {
        classNames.split(' ').forEach((className) => elements.classList.add(className));
      } else {
        if ( elements.classList ) { elements.classList.add(classNames); }
      }
    }
  }
  _removeClass(elements, classNames) {
    if ( elements.length ) {
      elements.forEach( (el: any) => {
        if (classNames.indexOf(' ') > 0) {
          classNames.split(' ').forEach((className) => {
            el.classList.remove(className)
          });
        } else {
          el.classList.remove(classNames);
        }
      });
    } else {
      if ( classNames.indexOf(' ') > 0 ) {
        classNames.split(' ').forEach((className) => {
          elements.classList.remove(className)
        });
      } else {
        if ( elements.classList ) { elements.classList.remove(classNames); }
      }
    }
  }
  _css(elements, prop, val) {
    elements.forEach((el) => {
      el.style[prop] = val;
    });
  }
  _removeAttr(elements, attr) {
    elements.forEach((el) => {
      el.removeAttribute(attr);
    });
  }
  _one(el: any, type: any, listener?: any, self?: any) {
    const one = (event) => {
      try {
        listener.call(self, event);
      } finally {
        el.removeEventListener(type, one);
      }
    };
    el.addEventListener(type, one);
  }
  _getDescElements(ancestors, selector) {
    const results = [];

    ancestors.forEach((el) => results.push(...el.querySelectorAll(selector)));
    return results;
  }
  _getJSON(url): Promise<any> {
    return new Promise( (resolve, reject) => {
      const xhr = new XMLHttpRequest();

      function handler() {
        if (this.readyState !== 4) {
          return;
        }
        if (this.status === 200) {
          if ( typeof this.response !== 'object' ) {
            resolve(JSON.parse(this.response));
          } else {
            resolve(this.response);
          }
        } else {
          reject(new Error(this.statusText));
        }
      }
      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send();
    });
  }
  _buildJsonDS(li) {
    const subObj: any = {
      name: li.firstChild.textContent.trim(),
      relationship: (li.parentNode.parentNode.nodeName === 'LI' ? '1' : '0') +
        (li.parentNode.children.length > 1 ? 1 : 0) + (li.children.length ? 1 : 0),
    };

    if (li.id) {
      subObj.id = li.id;
    }
    if (li.querySelector('ul')) {
      Array.from(li.querySelector('ul').children).forEach((el) => {
        if (! subObj.children) { subObj.children = []; }
        subObj.children.push(this._buildJsonDS(el));
      });
    }
    return subObj;
  }
  _attachRel(data, flags) {
    data.relationship = flags + (data.children && data.children.length > 0 ? 1 : 0);
    if (data.children) {
      for (const item of data.children) {
        this._attachRel(item, '1' + (data.children.length > 1 ? 1 : 0));
      }
    }
    return data;
  }
  _repaint(node) {
    if (node) {
      node.style.offsetWidth = node.offsetWidth;
    }
  }
  // whether the cursor is hovering over the node
  _isInAction(node) {
    const localNode = this._getQuerySelectorScope(node, 'className', 'edge');
    return localNode.className.indexOf('fa-') > -1;
  }
  // detect the exist/display state of related node
  _getNodeState(node, relation) {
    let criteria;
    const state = { exist: false, visible: false };

    if (relation === 'parent') {
      criteria = this._closest(node, (el) => el.classList && el.classList.contains('nodes'));
      if (criteria) {
        state.exist = true;
      }
      if (state.exist && this._isVisible(criteria.parentNode.children[0])) {
        state.visible = true;
      }
    } else if (relation === 'children') {
      criteria = this._closest(node, (el) => el.nodeName === 'TR').nextElementSibling;
      if (criteria) {
        state.exist = true;
      }
      if (state.exist && this._isVisible(criteria)) {
        state.visible = true;
      }
    } else if (relation === 'siblings') {
      criteria = this._siblings( this._closest(node, (el) => el.nodeName === 'TABLE').parentNode );
      if (criteria.length) {
        state.exist = true;
      }
      if (state.exist && criteria.some((el) => this._isVisible(el))) {
        state.visible = true;
      }
    }

    return state;
  }

  _getQuerySelectorScope(el, typeName, typeNameComparator) {
    let elm;
    Array.prototype.reduce.call(el.children, (acc, e) => {
      if ( e[typeName].indexOf(typeNameComparator) !== -1 ) { elm = e; }
      return false;
    }, []);
    return elm;
  }

  _getQuerySelectorAllScope(el, typeName, typeNameComparator, isEqual = true) {
    const elm = [];
    Array.prototype.reduce.call(el.children, (acc, e) => {
      if ( isEqual ) {
        if ( e[typeName].indexOf(typeNameComparator) !== -1 ) { elm.push(e); }
      } else {
        if ( e[typeName].indexOf(typeNameComparator) === -1 ) { elm.push(e); }
      }
      return false;
    }, []);
    return elm;
  }

  _removeFocusedNodes() {
    const focused = document.querySelectorAll('.focused');

    if ( focused.length > 0 ) {
      for ( let index = 0, len = focused.length; index < len; index++ ) {
        if ( focused && typeof focused === 'object' ) { focused[index].classList.remove('focused'); }
      }
    }
  }

  // find the related nodes
  getRelatedNodes(node, relation) {
    if (relation === 'parent') {
      return this._closest(node, (el) => el.classList.contains('nodes'))
        .parentNode.children[0].querySelector('.node');
    } else if (relation === 'children') {
      return Array.from(this._closest(node, (el) => el.nodeName === 'TABLE').lastChild.children)
        .map((el: any) => el.querySelector('.node'));
    } else if (relation === 'siblings') {
      return this._siblings(this._closest(node, (el) => el.nodeName === 'TABLE').parentNode)
        .map((el: any) => el.querySelector('.node'));
    }
    return [];
  }
  _switchHorizontalArrow(node: any) {
    const opts = this.options;
    const leftEdge = node.querySelector('.leftEdge');
    const rightEdge = node.querySelector('.rightEdge');
    const temp = this._closest(node, (el: any) => el.nodeName === 'TABLE').parentNode;

    if (opts.toggleSiblingsResp && (typeof opts.ajaxURL === 'undefined' ||
      this._closest(node, (el: any) => el.classList.contains('.nodes')).dataset.siblingsLoaded)) {
      const prevSib = temp.previousElementSibling;
      const nextSib = temp.nextElementSibling;

      if (prevSib) {
        if (prevSib.classList.contains('hidden')) {
          leftEdge.classList.add('fa-chevron-left');
          leftEdge.classList.remove('fa-chevron-right');
        } else {
          leftEdge.classList.add('fa-chevron-right');
          leftEdge.classList.remove('fa-chevron-left');
        }
      }
      if (nextSib) {
        if (nextSib.classList.contains('hidden')) {
          rightEdge.classList.add('fa-chevron-right');
          rightEdge.classList.remove('fa-chevron-left');
        } else {
          rightEdge.classList.add('fa-chevron-left');
          rightEdge.classList.remove('fa-chevron-right');
        }
      }
    } else {
      const sibs = this._siblings(temp);
      const sibsVisible = sibs.length ? !sibs.some((el: any) => el.classList.contains('hidden')) : false;

      if ( leftEdge ) { leftEdge.classList.toggle('fa-chevron-right', sibsVisible); }
      if ( leftEdge ) { leftEdge.classList.toggle('fa-chevron-left', !sibsVisible); }
      if ( rightEdge ) { rightEdge.classList.toggle('fa-chevron-left', sibsVisible); }
      if ( rightEdge ) { rightEdge.classList.toggle('fa-chevron-right', !sibsVisible); }
    }
  }
  _hoverNode(event) {
    const node = event.target;
    let flag = false;

    const topEdge = this._getQuerySelectorScope(node, 'className', 'topEdge');
    const bottomEdge = this._getQuerySelectorScope(node, 'className', 'bottomEdge');
    const leftEdge = this._getQuerySelectorScope(node, 'className', 'leftEdge');

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
    } else {
      const edges = this._getQuerySelectorAllScope(node, 'className', 'edge');
      Array.from( edges ).forEach((el) => {
        el.classList.remove('fa-chevron-up');
        el.classList.remove('fa-chevron-down');
        el.classList.remove('fa-chevron-right');
        el.classList.remove('fa-chevron-left');
      });
    }
  }
  // define node click event handler
  _clickNode(event) {
    const clickedNode = event.currentTarget;
    const focusedNode = this.chart.querySelector('.focused');

    this._removeFocusedNodes();
    clickedNode.classList.add('focused');
  }
  // build the parent node of specific node
  _buildParentNode(currentRoot: any, nodeData: any, callback?: any) {
    const table = document.createElement('table');

    nodeData.relationship = nodeData.relationship || '001';
    this._createNode(nodeData, 0)
      .then( (nodeDiv: any) => {
        const chart = this.chart;

        nodeDiv.classList.remove('slide-up');
        nodeDiv.classList.add('slide-down');

        const parentTr = document.createElement('tr');
        const superiorLine = document.createElement('tr');
        const inferiorLine = document.createElement('tr');
        const childrenTr = document.createElement('tr');

        parentTr.setAttribute('class', 'hidden');
        parentTr.innerHTML = `<td colspan="2"></td>`;
        table.appendChild(parentTr);
        superiorLine.setAttribute('class', 'lines hidden');
        superiorLine.innerHTML = `<td colspan="2"><div class="downLine"></div></td>`;
        table.appendChild(superiorLine);
        inferiorLine.setAttribute('class', 'lines hidden');
        inferiorLine.innerHTML = `<td class="rightLine">&nbsp;</td><td class="leftLine">&nbsp;</td>`;
        table.appendChild(inferiorLine);
        childrenTr.setAttribute('class', 'nodes');
        childrenTr.innerHTML = `<td colspan="2"></td>`;
        table.appendChild(childrenTr);
        table.querySelector('td').appendChild(nodeDiv);
        chart.insertBefore(table, chart.children[0]);
        table.children[3].children[0].appendChild(chart.lastChild);
        callback();
      })
      .catch( (err) => {
        console.error('Failed to create parent node', err);
      });
  }
  _switchVerticalArrow(arrow) {
    arrow.classList.toggle('fa-chevron-up');
    arrow.classList.toggle('fa-chevron-down');
  }
  // show the parent node of the specified node
  showParent(node: any) {
    // just show only one superior level
    const temp = this._prevAll(this._closest(node, (el) => el.classList.contains('nodes')));

    this._removeClass(node, 'collapsed');
    this._addClass(node, 'expanded');

    this._removeClass(temp, 'hidden');
    // just show only one line
    this._addClass(Array(temp[0].children).slice(1, -1), 'hidden');
    // show parent node with animation
    const parent = temp[2].querySelector('.node');

    this._one(parent, 'transitionend', () => {
      parent.classList.remove('slide');
      if (this._isInAction(node)) {
        const topArrow = this._getQuerySelectorScope(node, 'className', 'topEdge');
        this._switchVerticalArrow(topArrow);
        this.repositionChart(node);
      }
    }, this);
    this._repaint(parent);
    parent.classList.add('slide');
    parent.classList.remove('slide-down');
    this._removeFocusedNodes();
    this._addClass(node, 'focused');
  }
  // show the sibling nodes of the specified node
  showSiblings(node: any, direction?: any) {
    // firstly, show the sibling td tags
    let siblings = [];
    let temp = this._closest(node, (el) => el.nodeName === 'TABLE').parentNode;

    this._removeClass(node, 'collapsed');
    this._addClass(node, 'expanded');
    this._removeFocusedNodes()
    this._addClass(node, 'focused');

    if (direction) {
      siblings = direction === 'left' ? this._prevAll(temp) : this._nextAll(temp);
    } else {
      siblings = this._siblings(temp);
    }
    this._removeClass(siblings, 'hidden');
    // secondly, show the lines
    const upperLevel = this._prevAll(this._closest(node, (el) => el.classList.contains('nodes')));
    const hiddenUpperLevel = this._getQuerySelectorAllScope(upperLevel[0], 'className', 'hidden');
    temp = Array.from(hiddenUpperLevel);
    if (direction) {
      this._removeClass(temp.slice(0, siblings.length * 2), 'hidden');
    } else {
      this._removeClass(temp, 'hidden');
    }
    // thirdly, do some cleaning stuff
    if (!this._getNodeState(node, 'parent').visible) {
      this._removeClass(upperLevel, 'hidden');
      const parent = upperLevel[2].querySelector('.node');

      this._one(parent, 'transitionend', (event) => {
        event.target.classList.remove('slide');
      }, this);
      this._repaint(parent);
      parent.classList.add('slide');
      parent.classList.remove('slide-down');
    }
    // lastly, show the sibling nodes with animation
    siblings.forEach( (sib: any) => {
      Array.from(sib.querySelectorAll('.node')).forEach( (innerNode: any) => {
        if (this._isVisible(innerNode)) {
          innerNode.classList.add('slide');
          innerNode.classList.remove('slide-left');
          innerNode.classList.remove('slide-right');
        }
      });
    });
    this._one(siblings[0].querySelector('.slide'), 'transitionend', () => {
      siblings.forEach((sib) => {
        this._removeClass(Array.from(sib.querySelectorAll('.slide')), 'slide');
      });
      if (this._isInAction(node)) {
        this._switchHorizontalArrow(node);
        node.querySelector('.topEdge').classList.remove('fa-chevron-up');
        node.querySelector('.topEdge').classList.add('fa-chevron-down');
      }
      this.repositionChart(node);
    }, this);
  }
  // hide the sibling nodes of the specified node
  hideSiblings(node: any, direction?: any) {
    const nodeContainer = this._closest(node, (el) => el.nodeName === 'TABLE').parentNode;
    const siblings = this._siblings(nodeContainer);

    this._addClass(node, 'collapsed');
    this._removeFocusedNodes();
    this._addClass(node, 'focused');
    this._removeClass(node, 'expanded');

    siblings.forEach((sib: any) => {
      if (sib.querySelector('.spinner')) {
        this.chart.dataset.inAjax = false;
      }
    });

    if (!direction || (direction && direction === 'left')) {
      const preSibs = this._prevAll(nodeContainer);

      preSibs.forEach((sib) => {
        Array.from(sib.querySelectorAll('.node')).forEach((innerNode: any) => {
          if (this._isVisible(innerNode)) {
            innerNode.classList.add('slide');
            innerNode.classList.add('slide-right');
          }
        });
      });
    }
    if (!direction || (direction && direction !== 'left')) {
      const nextSibs = this._nextAll(nodeContainer);

      nextSibs.forEach((sib) => {
        Array.from(sib.querySelectorAll('.node')).forEach((innerNode: any) => {
          if (this._isVisible(innerNode)) {
            innerNode.classList.add('slide');
            innerNode.classList.add('slide-left');
          }
        });
      });
    }

    const animatedNodes = [];

    this._siblings(nodeContainer).forEach((sib: any) => {
      Array.prototype.push.apply(animatedNodes, Array.from(sib.querySelectorAll('.slide')));
    });
    let lines = [];

    for (const innerNode of animatedNodes) {
      const temp = this._closest(innerNode, (el: any) => {
        return el.classList.contains('nodes');
      }).previousElementSibling;

      lines.push(temp);
      lines.push(temp.previousElementSibling);
    }

    lines = lines.filter( (value, index, arr) => {
      return arr.indexOf(value) === index;
    } );
    lines.forEach( (line: any) => { line.style.visibility = 'hidden'; });

    this._one(animatedNodes[0], 'transitionend', (event) => {
      lines.forEach( (line) => {
        line.removeAttribute('style');
      });
      let sibs = [];

      if (direction) {
        if (direction === 'left') {
          sibs = this._prevAll(nodeContainer, ':not(.hidden)');
        } else {
          sibs = this._nextAll(nodeContainer, ':not(.hidden)');
        }
      } else {
        sibs = this._siblings(nodeContainer);
      }
      const tempClosest = this._closest(nodeContainer, (el) => {
        return el.classList.contains('nodes');
      }).previousElementSibling;
      const tempClosestSelectors = this._getQuerySelectorAllScope( tempClosest, 'className', 'hidden', false );
      const temp = Array.from( tempClosestSelectors );

      const someLines = temp.slice(1, direction ? sibs.length * 2 + 1 : -1);

      this._addClass(someLines, 'hidden');
      this._removeClass(animatedNodes, 'slide');
      sibs.forEach((sib) => {
        Array.from(sib.querySelectorAll('.node')).slice(1).forEach((innerNode: any) => {
          if (this._isVisible(innerNode)) {
            innerNode.classList.remove('slide-left', 'slide-right');
            innerNode.classList.add('slide-up');
          }
        });
      });
      sibs.forEach((sib) => {
        this._addClass(Array.from(sib.querySelectorAll('.lines')), 'hidden');
        this._addClass(Array.from(sib.querySelectorAll('.nodes')), 'hidden');
        this._addClass(Array.from(sib.querySelectorAll('.verticalNodes')), 'hidden');
      });
      this._addClass(sibs, 'hidden');

      if (this._isInAction(node)) {
        this._switchHorizontalArrow(node);
      }
      this.repositionChart(node);
    }, this);
  }
  // recursively hide the ancestor node and sibling nodes of the specified node
  hideParent(node) {
    if ( !this.currentNode ) { this.currentNode = node; }
    const temp: any = Array.from(this._closest(node, (el: any) => {
      return el.classList.contains('nodes');
    }).parentNode.children).slice(0, 3);

    this._addClass(node, 'collapsed');
    this._removeFocusedNodes();
    this._addClass(node, 'focused');
    this._removeClass(node, 'expanded');

    if (temp[0].querySelector('.spinner')) {
      this.chart.dataset.inAjax = false;
    }
    // hide the sibling nodes
    if (this._getNodeState(node, 'siblings').visible) {
      this.hideSiblings(node);
    }
    // hide the lines
    const lines = temp.slice(1);

    this._css(lines, 'visibility', 'hidden');
    // hide the superior nodes with transition
    const parent = temp[0].querySelector('.node');
    const grandfatherVisible = this._getNodeState(parent, 'parent').visible;

    if (parent && this._isVisible(parent)) {
      parent.classList.add('slide');
      parent.classList.add('slide-down');
      this._one(parent, 'transitionend', () => {
        parent.classList.remove('slide');
        this._removeAttr(lines, 'style');
        this._addClass(temp, 'hidden');
        this.repositionChart(this.currentNode);

        // if the current node has the parent node, hide it recursively
        if (parent && grandfatherVisible) {
          this.hideParent(parent);
        }else {
          this.currentNode = null;
        }

      }, this);
    }
  }
  // exposed method
  addParent(currentRoot, data) {

    this._buildParentNode(currentRoot, data, () => {
      const topEgdeCheck = this._getQuerySelectorScope(currentRoot, 'className', 'topEdge');
      if ( !topEgdeCheck ) {
        const topEdge = document.createElement('i');

        topEdge.setAttribute('class', 'edge verticalEdge topEdge fa');
        currentRoot.appendChild(topEdge);
      }
      this.showParent(currentRoot);
    });
  }
  // start up loading status for requesting new nodes
  _startLoading(arrow, node) {
    const opts = this.options;
    const chart = this.chart;

    if (typeof chart.dataset.inAjax !== 'undefined' && chart.dataset.inAjax === 'true') {
      return false;
    }

    arrow.classList.add('hidden');
    const spinner = document.createElement('i');

    spinner.setAttribute('class', 'fa fa-circle-o-notch fa-spin spinner');
    node.appendChild(spinner);
    const allElmsButSpinner = this._getQuerySelectorAllScope( node, 'className', 'spinner', false );
    this._addClass(Array.from( allElmsButSpinner ), 'hazy');
    chart.dataset.inAjax = true;

    const exportBtn = this.chartContainer.querySelector('.oc-export-btn' +
      (opts.chartClass !== '' ? '.' + opts.chartClass : ''));

    if (exportBtn) {
      exportBtn.disabled = true;
    }
    return true;
  }
  // terminate loading status for requesting new nodes
  _endLoading(arrow, node) {
    const opts = this.options;

    arrow.classList.remove('hidden');
    const spinner = this._getQuerySelectorScope(node, 'className', 'spinner');
    node.removeChild(spinner);
    const hazyElm = this._getQuerySelectorAllScope(node, 'className', 'hazy' );
    this._removeClass(Array.from( hazyElm ), 'hazy');
    this.chart.dataset.inAjax = false;
    const exportBtn = this.chartContainer.querySelector('.oc-export-btn' +
      (opts.chartClass !== '' ? '.' + opts.chartClass : ''));

    if (exportBtn) {
      exportBtn.disabled = false;
    }
  }
  // define click event handler for the top edge
  _clickTopEdge(event: any) {
    event.stopPropagation();
    const topEdge = event.target;
    const node = topEdge.parentNode;
    const parentState = this._getNodeState(node, 'parent');
    const opts = this.options;

    if (parentState.exist) {
      const temp = this._closest(node, (el) => {
        return el.classList.contains('nodes');
      });
      const parent = temp.parentNode.firstChild.querySelector('.node');

      if (parent.classList.contains('slide')) { return; }
      // hide the ancestor nodes and sibling nodes of the specified node
      if (parentState.visible) {
        this.hideParent(node);
        this._one(parent, 'transitionend', () => {
          if (this._isInAction(node)) {
            this._switchVerticalArrow(topEdge);
            this._switchHorizontalArrow(node);
            this.repositionChart(node);
          }
        }, this);
      } else { // show the ancestors and siblings
        this.showParent(node);
      }
    } else {
      // load the new parent node of the specified node by ajax request
      const nodeId = topEdge.parentNode.id;

      // start up loading status
      if (this._startLoading(topEdge, node)) {
        // load new nodes
        this._getJSON(typeof opts.ajaxURL.parent === 'function' ?
          opts.ajaxURL.parent(node.dataset.source) : opts.ajaxURL.parent + nodeId)
        .then( (resp) => {
          if (this.chart.dataset.inAjax === 'true') {
            if (Object.keys(resp).length) {
              this.addParent(node, resp);
            }
          }
          this._endLoading(topEdge, node);
        })
        .catch( (err) => {
          console.error('Failed to get parent node data.', err);
        });
      }
    }
  }

  // recursively hide the descendant nodes of the specified node
  hideChildren(node: any, deleteEl?: any) {
    const temp = this._nextAll(node.parentNode.parentNode);
    const lastItem = temp[temp.length - 1];
    let lines = [];

    this._addClass(node, 'collapsed');
    this._removeClass(node, 'expanded');
    if (lastItem.querySelector('.spinner')) {
      this.chart.dataset.inAjax = false;
    }
    const descendants = Array.from(lastItem.querySelectorAll('.node')).filter((el) => this._isVisible(el));
    const isVerticalDesc = lastItem.classList.contains('verticalNodes');

    if (!isVerticalDesc) {
      descendants.forEach((desc) => {
        Array.prototype.push.apply(lines,
          this._prevAll(this._closest(desc, (el) => el.classList.contains('nodes')), '.lines'));
      });
      lines = lines.filter( (value, index, arr) => {
        return arr.indexOf(value) === index;
      } );
      this._css(lines, 'visibility', 'hidden');
    }
    this._one(descendants[0], 'transitionend', (event) => {
      this._removeClass(descendants, 'slide');

      if (isVerticalDesc) {
        this._addClass(temp, 'hidden');

        if ( deleteEl ) {
          for ( let i = temp.length - 1; i >= 0; i-- ) {
            const childNode = temp[i];
            childNode.parentNode.removeChild(childNode);
          }
        }
      } else {
        lines.forEach((el) => {
          el.removeAttribute('style');
          el.classList.add('hidden');
          el.parentNode.lastChild.classList.add('hidden');
        });
        this._addClass(Array.from(lastItem.querySelectorAll('.verticalNodes')), 'hidden');

        if ( deleteEl ) {
          for ( let i = lastItem.parentNode.getElementsByClassName('lines').length - 1; i >= 0; i-- ) {
            const childNode = lastItem.parentNode.getElementsByClassName('lines')[i];
            childNode.parentNode.removeChild(childNode);
          }

          for ( let i = lastItem.parentNode.getElementsByClassName('nodes').length - 1; i >= 0; i-- ) {
            const childNode = lastItem.parentNode.getElementsByClassName('nodes')[i];
            childNode.parentNode.removeChild(childNode);
          }
        }
      }
      if (this._isInAction(node)) {
        this._switchVerticalArrow(node.querySelector('.bottomEdge'));
      }

      this.repositionChart(node);

    }, this);
    this._addClass(descendants, 'slide slide-up');
    this._removeFocusedNodes();
    this._addClass(node, 'focused');
  }
  // show the children nodes of the specified node
  showChildren(node: any) {
    const temp = this._nextAll(node.parentNode.parentNode);
    const descendants = [];

    this._removeClass(node, 'collapsed');
    this._addClass(node, 'expanded');

    this._removeClass(temp, 'hidden');

    if (temp.some((el) => el.classList.contains('verticalNodes'))) {
      temp.forEach((el) => {
        Array.prototype.push.apply(descendants, Array.from(el.querySelectorAll('.node')).filter((innerEl: any) => {
          return this._isVisible(innerEl);
        }));
      });
    } else {
      Array.from(temp[2].children).forEach((el: any) => {
          Array.prototype.push.apply(
            descendants,
            Array.from(el.querySelector('tr').querySelectorAll('.node')).filter((innerEl: any) => {
              return this._isVisible(innerEl);
            }),
          );
      });
    }
    // the two following statements are used to enforce browser to repaint
    this._repaint(descendants[0]);
    this._one(descendants[0], 'transitionend', (event) => {
      this._removeClass(descendants, 'slide');
      if (this._isInAction(node)) {
        this._switchVerticalArrow(node.querySelector('.bottomEdge'));
      };
      this.repositionChart(node);
    }, this);
    this._addClass(descendants, 'slide');
    this._removeFocusedNodes();
    this._addClass(node, 'focused');
    this._removeClass(descendants, 'slide-up');
  }
  // build the child nodes of specific node
  _buildChildNode(appendTo, nodeData, callback) {
    const data = nodeData.children || nodeData.siblings;

    appendTo.querySelector('td').setAttribute('colSpan', data.length * 2);
    this.buildHierarchy(appendTo, { children: data }, 0, callback);
  }
  // exposed method
  addChildren(node: any, data?: any) {
    const opts = this.options;
    let count = 0;

    this.chart.dataset.inEdit = 'addChildren';
    this._buildChildNode.call(this, this._closest(node, (el) => el.nodeName === 'TABLE'), data, () => {

      if (++count === data.children.length) {
        if (!node.querySelector('.bottomEdge')) {
          const bottomEdge = document.createElement('i');

          bottomEdge.setAttribute('class', 'edge verticalEdge bottomEdge fa');
          node.appendChild(bottomEdge);
        }
        if (!node.querySelector('.symbol')) {
          const symbol = document.createElement('i');

          symbol.setAttribute('class', 'fa ' + opts.parentNodeSymbol + ' symbol');
          const titleElm = this._getQuerySelectorScope( node, 'className', 'title' );
          titleElm.appendChild(symbol);
        }
        this.showChildren(node);
        this.chart.dataset.inEdit = '';
      }
    });
  }
  // bind click event handler for the bottom edge
  _clickBottomEdge(event) {
    event.stopPropagation();
    const opts = this.options;
    const bottomEdge = event.target;
    const node = bottomEdge.parentNode;
    const childrenState = this._getNodeState(node, 'children');

    if (!opts.ajaxURL) {
      if (childrenState.exist) {
        const temp = this._closest(node, (el) => {
          return el.nodeName === 'TR';
        }).parentNode.lastChild;

        if (Array.from(temp.querySelectorAll('.node')).some((innerNode: any) => {
          return this._isVisible(innerNode) && innerNode.classList.contains('slide');
        })) { return; }
        // hide the descendant nodes of the specified node
        if (childrenState.visible) {
          this.hideChildren(node);
        } else { // show the descendants
          this.showChildren(node);
        }
      }
    } else {
      if (childrenState.visible) {
        this.hideChildren(node, true);
      } else {
        const nodeId = bottomEdge.parentNode.id;

        if (this._startLoading(bottomEdge, node)) {
          this._getJSON(typeof opts.ajaxURL.children === 'function' ?
            opts.ajaxURL.children(node.dataset.source) : opts.ajaxURL.children + nodeId)
          .then( (resp) => {
            if (this.chart.dataset.inAjax === 'true') {
              if (resp.children && resp.children.length) {
                this.addChildren(node, resp);
              } else {
                const hazyElm = this._getQuerySelectorAllScope(node, 'className', 'hazy' );
                this._removeClass(Array.from( hazyElm ), 'hazy');
              }
            }
            this._endLoading(bottomEdge, node);
          })
          .catch( (err) => {
            console.error('Failed to get children nodes data', err);
          });
        }
      }
    }
  }
  // subsequent processing of build sibling nodes
  _complementLine(oneSibling, siblingCount, existingSibligCount) {
    const temp = oneSibling.parentNode.parentNode.children;

    temp[0].children[0].setAttribute('colspan', siblingCount * 2);
    temp[1].children[0].setAttribute('colspan', siblingCount * 2);
    for (let i = 0; i < existingSibligCount; i++) {
      const rightLine = document.createElement('td');
      const leftLine = document.createElement('td');

      rightLine.setAttribute('class', 'rightLine topLine');
      rightLine.innerHTML = '&nbsp;';
      temp[2].insertBefore(rightLine, temp[2].children[1]);
      leftLine.setAttribute('class', 'leftLine topLine');
      leftLine.innerHTML = '&nbsp;';
      temp[2].insertBefore(leftLine, temp[2].children[1]);
    }
  }
  // build the sibling nodes of specific node
  _buildSiblingNode(nodeChart, nodeData, callback) {
    const newSiblingCount = nodeData.siblings ? nodeData.siblings.length : nodeData.children.length;
    const existingSibligCount = nodeChart.parentNode.nodeName === 'TD' ? this._closest(nodeChart, (el) => {
        return el.nodeName === 'TR';
      }).children.length : 1;
    const siblingCount = existingSibligCount + newSiblingCount;
    const insertPostion = (siblingCount > 1) ? Math.floor(siblingCount / 2 - 1) : 0;

    // just build the sibling nodes for the specific node
    if (nodeChart.parentNode.nodeName === 'TD') {
      const temp = this._prevAll(nodeChart.parentNode.parentNode);

      temp[0].remove();
      temp[1].remove();
      let childCount = 0;

      this._buildChildNode.call(this, this._closest(nodeChart.parentNode, (el) => el.nodeName === 'TABLE'),
        nodeData, () => {
          if (++childCount === newSiblingCount) {
            const siblingTds: any = Array.from(this._closest(nodeChart.parentNode, (el) => el.nodeName === 'TABLE')
              .lastChild.children);

            if (existingSibligCount > 1) {
              const innerTemp = nodeChart.parentNode.parentNode;
              Array.from(innerTemp.children).forEach((el) => {
                siblingTds[0].parentNode.insertBefore(el, siblingTds[0]);
              });
              innerTemp.remove();
              this._complementLine(siblingTds[0], siblingCount, existingSibligCount);
              this._addClass(siblingTds, 'hidden');

              siblingTds.forEach((el) => {
                const nodes = Array.prototype.slice.call(el.querySelectorAll('.node'), 0);
                this._addClass(nodes, 'slide-left');
              });
            } else {
              const innerTemp = nodeChart.parentNode.parentNode;

              siblingTds[insertPostion].parentNode.insertBefore(nodeChart.parentNode, siblingTds[insertPostion + 1]);
              innerTemp.remove();
              this._complementLine(siblingTds[insertPostion], siblingCount, 1);
              this._addClass(siblingTds, 'hidden');
              this._addClass(this._getDescElements(siblingTds.slice(0, insertPostion + 1), '.node'), 'slide-right');
              this._addClass(this._getDescElements(siblingTds.slice(insertPostion + 1), '.node'), 'slide-left');
            }
            callback();
          }
        });
    } else { // build the sibling nodes and parent node for the specific ndoe
      let nodeCount = 0;

      this.buildHierarchy.call(this, this.chart, nodeData, 0, () => {
        if (++nodeCount === siblingCount) {
          const temp = nodeChart.nextElementSibling.children[3]
            .children[insertPostion];
          const td = document.createElement('td');

          td.setAttribute('colspan', '2');
          td.appendChild(nodeChart);
          temp.parentNode.insertBefore(td, temp.nextElementSibling);
          this._complementLine(temp, siblingCount, 1);

          const temp2 = this._closest(nodeChart, (el) => el.classList && el.classList.contains('nodes'))
            .parentNode.children[0];

          temp2.classList.add('hidden');
          this._addClass(Array.from(temp2.querySelectorAll('.node')), 'slide-down');

          const temp3 = this._siblings(nodeChart.parentNode);

          this._addClass(temp3, 'hidden');
          this._addClass(this._getDescElements(temp3.slice(0, insertPostion), '.node'), 'slide-right');
          this._addClass(this._getDescElements(temp3.slice(insertPostion), '.node'), 'slide-left');
          callback();
        }
      });
    }
  }
  addSiblings(node, data) {

    this.chart.dataset.inEdit = 'addSiblings';

    this._buildSiblingNode.call(this, this._closest(node, (el) => el.nodeName === 'TABLE'), data, () => {
      this._closest(node, (el) => el.classList && el.classList.contains('nodes'))
        .dataset.siblingsLoaded = true;

      if (!node.querySelector('.leftEdge')) {
        const rightEdge = document.createElement('i');
        const leftEdge = document.createElement('i');

        rightEdge.setAttribute('class', 'edge horizontalEdge rightEdge fa');
        node.appendChild(rightEdge);
        leftEdge.setAttribute('class', 'edge horizontalEdge leftEdge fa');
        node.appendChild(leftEdge);
      }
      this.showSiblings(node);
      this.chart.dataset.inEdit = '';
    });
  }
  removeNodes(node) {
    const parent = this._closest(node, (el) => el.nodeName === 'TABLE').parentNode;
    const sibs: any = this._siblings(parent.parentNode);

    if (parent.nodeName === 'TD') {
      if (this._getNodeState(node, 'siblings').exist) {
        sibs[2].querySelector('.topLine').nextElementSibling.remove();
        sibs[2].querySelector('.topLine').remove();
        sibs[0].children[0].setAttribute('colspan', sibs[2].children.length);
        sibs[1].children[0].setAttribute('colspan', sibs[2].children.length);
        parent.remove();
      } else {
        sibs[0].children[0].removeAttribute('colspan');
        sibs[0].querySelector('.bottomEdge').remove();
        this._siblings(sibs[0]).forEach( (el: any) => el.remove());
      }
    } else {
      Array.from(parent.parentNode.children).forEach( (el: any) => el.remove());
    }
  }
  // bind click event handler for the left and right edges
  _clickHorizontalEdge(event) {
    event.stopPropagation();
    const opts = this.options;
    const hEdge = event.target;
    const node = hEdge.parentNode;
    const siblingsState = this._getNodeState(node, 'siblings');

    if (siblingsState.exist) {
      const temp = this._closest(node, (el) => {
          return el.nodeName === 'TABLE';
        }).parentNode;
      const siblings = this._siblings(temp);

      if (siblings.some((el: any) => {
        const innerNode = el.querySelector('.node');

        return this._isVisible(innerNode) && innerNode.classList.contains('slide');
      })) { return; }
      if (opts.toggleSiblingsResp) {
        const prevSib = this._closest(node, (el) => el.nodeName === 'TABLE').parentNode.previousElementSibling;
        const nextSib = this._closest(node, (el) => el.nodeName === 'TABLE').parentNode.nextElementSibling;
        if (hEdge.classList.contains('leftEdge')) {
          if (prevSib.classList.contains('hidden')) {
            this.showSiblings(node, 'left');
          } else {
            this.hideSiblings(node, 'left');
          }
        } else {
          if (nextSib.classList.contains('hidden')) {
            this.showSiblings(node, 'right');
          } else {
            this.hideSiblings(node, 'right');
          }
        }
      } else {
        if (siblingsState.visible) {
          this.hideSiblings(node);
        } else {
          this.showSiblings(node);
        }
      }
    } else {
      // load the new sibling nodes of the specified node by ajax request
      const nodeId = hEdge.parentNode.id;
      const url = (this._getNodeState(node, 'parent').exist) ?
          (typeof opts.ajaxURL.siblings === 'function' ?
            opts.ajaxURL.siblings(JSON.parse(node.dataset.source)) : opts.ajaxURL.siblings + nodeId) :
          (typeof opts.ajaxURL.families === 'function' ?
            opts.ajaxURL.families(JSON.parse(node.dataset.source)) : opts.ajaxURL.families + nodeId);

      if (this._startLoading(hEdge, node)) {
        this._getJSON(url)
        .then( (resp) => {
          if (this.chart.dataset.inAjax === 'true') {
            if (resp.siblings || resp.children) {
              this.addSiblings(node, resp);
            }
          }
          this._endLoading(hEdge, node);
        })
        .catch( (err) => {
          console.error('Failed to get sibling nodes data', err);
        });
      }
    }
  }
  // event handler for toggle buttons in Hybrid(horizontal + vertical) OrgChart
  _clickToggleButton(event) {
    const toggleBtn = event.target;
    const descWrapper = toggleBtn.parentNode.nextElementSibling;
    const descendants: any = Array.from(descWrapper.querySelectorAll('.node'));
    const children = Array.from(descWrapper.children).map( (item: any) => item.querySelector('.node'));

    if (children.some((item) => item.classList.contains('slide'))) { return; }
    toggleBtn.classList.toggle('fa-plus-square');
    toggleBtn.classList.toggle('fa-minus-square');
    if (descendants[0].classList.contains('slide-up')) {
      descWrapper.classList.remove('hidden');
      this._repaint(children[0]);
      this._addClass(children, 'slide');
      this._removeClass(children, 'slide-up');
      this._one(children[0], 'transitionend', () => {
        this._removeClass(children, 'slide');
      });
    } else {
      this._addClass(descendants, 'slide slide-up');
      this._one(descendants[0], 'transitionend', () => {
        this._removeClass(descendants, 'slide');
        descendants.forEach( (desc) => {
          const ul = this._closest(desc, (el) => {
            return el.nodeName === 'UL';
          });

          ul.classList.add('hidden');
        });
      });

      descendants.forEach( (desc) => {
        const subTBs = Array.from(desc.querySelectorAll('.toggleBtn'));

        this._removeClass(subTBs, 'fa-minus-square');
        this._addClass(subTBs, 'fa-plus-square');
      });
    }
  }
  _dispatchClickEvent(event) {
    const classList = event.target.classList;

    if (classList.contains('topEdge')) {
      this._clickTopEdge(event);
    } else if (classList.contains('rightEdge') || classList.contains('leftEdge')) {
      this._clickHorizontalEdge(event);
    } else if (classList.contains('bottomEdge')) {
      this._clickBottomEdge(event);
    } else if (classList.contains('toggleBtn')) {
      this._clickToggleButton(event);
    } else {
      this._clickNode(event);
    }
  }
  _onDragStart(event) {
    const nodeDiv = event.target;
    const opts = this.options;
    const isFirefox = /firefox/.test(window.navigator.userAgent.toLowerCase());

    if (isFirefox) {
      event.dataTransfer.setData('text/html', 'hack for firefox');
    }
    // if users enable zoom or direction options
    if (this.chart.style.transform) {
      let ghostNode;
      let nodeCover;

      if ( !document.getElementById('ghost-node') ) {
        ghostNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        ghostNode.id = 'ghost-node';
        ghostNode.classList.add('ghost-node');
        nodeCover = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        ghostNode.appendChild(nodeCover);
        this.chart.appendChild(ghostNode);
      } else {
        ghostNode = document.getElementById('ghost-node');
        nodeCover = ghostNode.children[0];
      }
      const transValues = this.chart.style.transform.split(',');
      const scale = Math.abs(parseFloat((opts.direction === 't2b' || opts.direction === 'b2t') ?
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
      let xOffset = event.offsetX * scale;
      let yOffset = event.offsetY * scale;

      if (opts.direction === 'l2r') {
        xOffset = event.offsetY * scale;
        yOffset = event.offsetX * scale;
      } else if (opts.direction === 'r2l') {
        xOffset = nodeDiv.offsetWidth - event.offsetY * scale;
        yOffset = event.offsetX * scale;
      } else if (opts.direction === 'b2t') {
        xOffset = nodeDiv.offsetWidth - event.offsetX * scale;
        yOffset = nodeDiv.offsetHeight - event.offsetY * scale;
      }
      if (isFirefox) { // hack for old version of Firefox(< 48.0)
        const ghostNodeWrapper = document.createElement('img');

        ghostNodeWrapper.src = 'data:image/svg+xml;utf8,' + (new XMLSerializer()).serializeToString(ghostNode);
        event.dataTransfer.setDragImage(ghostNodeWrapper, xOffset, yOffset);
        nodeCover.setAttribute('fill', 'rgb(255, 255, 255)');
        nodeCover.setAttribute('stroke', 'rgb(191, 0, 0)');
      } else {
        event.dataTransfer.setDragImage(ghostNode, xOffset, yOffset);
      }
    }
    const dragged = event.target;
    const dragZone = this._closest(dragged, (el) => {
        return el.classList && el.classList.contains('nodes');
      }).parentNode.children[0].querySelector('.node');
    const dragHier = Array.from(this._closest(dragged, (el) => {
        return el.nodeName === 'TABLE';
      }).querySelectorAll('.node'));

    this.dragged = dragged;
    Array.from(this.chart.querySelectorAll('.node')).forEach( (node: any) => {
      if ( !dragHier.includes(node) ) {
        if (opts.dropCriteria) {
          if (opts.dropCriteria(dragged, dragZone, node)) {
            node.classList.add('allowedDrop');
          }
        } else {
          node.classList.add('allowedDrop');
        }
      }
    });
  }
  _onDragOver(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;

    if (!dropZone.classList.contains('allowedDrop')) {
      event.dataTransfer.dropEffect = 'none';
    }
  }
  _onDragEnd(event) {
    Array.from(this.chart.querySelectorAll('.allowedDrop')).forEach( (el: any) => {
      el.classList.remove('allowedDrop');
    });
    const ghostNode = document.getElementById('ghost-node');
    ghostNode.parentNode.removeChild(ghostNode);
  }
  _onDrop(event) {
    const dropZone = event.currentTarget;
    const chart = this.chart;
    const dragged = this.dragged;
    const dragZone = this._closest(dragged, (el: any) => {
        return el.classList && el.classList.contains('nodes');
      }).parentNode.children[0].children[0];

    this._removeClass(Array.from(chart.querySelectorAll('.allowedDrop')), 'allowedDrop');
    // firstly, deal with the hierarchy of drop zone
    if (!dropZone.parentNode.parentNode.nextElementSibling) { // if the drop zone is a leaf node
      const bottomEdge = document.createElement('i');

      bottomEdge.setAttribute('class', 'edge verticalEdge bottomEdge fa');
      dropZone.appendChild(bottomEdge);
      dropZone.parentNode.setAttribute('colspan', 2);
      const table = this._closest(dropZone, (el) => {
          return el.nodeName === 'TABLE';
        });
      const upperTr = document.createElement('tr');
      const lowerTr = document.createElement('tr');
      const nodeTr = document.createElement('tr');

      upperTr.setAttribute('class', 'lines');
      upperTr.innerHTML = `<td colspan="2"><div class="downLine"></div></td>`;
      table.appendChild(upperTr);
      lowerTr.setAttribute('class', 'lines');
      lowerTr.innerHTML = `<td class="rightLine">&nbsp;</td><td class="leftLine">&nbsp;</td>`;
      table.appendChild(lowerTr);
      nodeTr.setAttribute('class', 'nodes');
      table.appendChild(nodeTr);
      Array.from(dragged.querySelectorAll('.horizontalEdge')).forEach((hEdge) => {
        dragged.removeChild(hEdge);
      });
      const draggedTd = this._closest(dragged, (el) => el.nodeName === 'TABLE').parentNode;

      nodeTr.appendChild(draggedTd);
    } else {
      const dropColspan = parseInt(dropZone.parentNode.colSpan, 10) + 2;

      dropZone.parentNode.setAttribute('colspan', dropColspan);
      dropZone.parentNode.parentNode.nextElementSibling.children[0].setAttribute('colspan', dropColspan);
      if (!dragged.querySelector('.horizontalEdge')) {
        const rightEdge = document.createElement('i');
        const leftEdge = document.createElement('i');

        rightEdge.setAttribute('class', 'edge horizontalEdge rightEdge fa');
        dragged.appendChild(rightEdge);
        leftEdge.setAttribute('class', 'edge horizontalEdge leftEdge fa');
        dragged.appendChild(leftEdge);
      }
      const temp = dropZone.parentNode.parentNode.nextElementSibling.nextElementSibling;
      const leftline = document.createElement('td');
      const rightline = document.createElement('td');

      leftline.setAttribute('class', 'leftLine topLine');
      leftline.innerHTML = `&nbsp;`;
      temp.insertBefore(leftline, temp.children[1]);
      rightline.setAttribute('class', 'rightLine topLine');
      rightline.innerHTML = `&nbsp;`;
      temp.insertBefore(rightline, temp.children[2]);
      temp.nextElementSibling.appendChild(this._closest(dragged, (el) => {
        return el.nodeName === 'TABLE';
      }).parentNode);

      const dropSibs = this._siblings(this._closest(dragged, (el: any) => {
        return el.nodeName === 'TABLE';
      }).parentNode).map((el: any) => el.querySelector('.node'));

      if (dropSibs.length === 1) {
        const rightEdge = document.createElement('i');
        const leftEdge = document.createElement('i');

        rightEdge.setAttribute('class', 'edge horizontalEdge rightEdge fa');
        dropSibs[0].appendChild(rightEdge);
        leftEdge.setAttribute('class', 'edge horizontalEdge leftEdge fa');
        dropSibs[0].appendChild(leftEdge);
      }
    }
    // secondly, deal with the hierarchy of dragged node
    const dragColSpan = parseInt(dragZone.colSpan, 10);

    if (dragColSpan > 2) {
      dragZone.setAttribute('colspan', dragColSpan - 2);
      dragZone.parentNode.nextElementSibling.children[0].setAttribute('colspan', dragColSpan - 2);
      const temp = dragZone.parentNode.nextElementSibling.nextElementSibling;

      temp.children[1].remove();
      temp.children[1].remove();

      const dragSibs = Array.from(dragZone.parentNode.parentNode.children[3].children).map( (td: any) => {
        return td.querySelector('.node');
      });

      if (dragSibs.length === 1) {
        dragSibs[0].querySelector('.leftEdge').remove();
        dragSibs[0].querySelector('.rightEdge').remove();
      }
    } else {
      dragZone.removeAttribute('colspan');
      dragZone.querySelector('.node').removeChild(dragZone.querySelector('.bottomEdge'));
      Array.from(dragZone.parentNode.parentNode.children).slice(1).forEach((tr: any) => tr.remove());
    }
    const customE = new CustomEvent('nodedropped.orgchart', { detail: {
      draggedNode: dragged,
      dragZone: dragZone.children[0],
      dropZone,
    }});

    chart.dispatchEvent(customE);
  }

  _checkBrowser() {
    const isIE = /(Edge|MSIE)/i.test(navigator.userAgent);

    return isIE;
  }
  // create node
  _createNode(nodeData, level) {
    const opts = this.options;

    return new Promise( (resolve, reject) => {

      if (nodeData.children) {
        for (const child of nodeData.children) {
          child.parentId = nodeData.id;
        }
      }

      // construct the content of node
      const nodeDiv = document.createElement('div');

      delete nodeData.children;

      nodeDiv.dataset.source = JSON.stringify(nodeData);
      if (nodeData[opts.nodeId]) {
        nodeDiv.id = nodeData[opts.nodeId];
      }
      const inEdit = this.chart.dataset.inEdit;
      let isHidden;

      if (inEdit) {
        isHidden = inEdit === 'addChildren' ? ' slide-up' : '';
      } else {
        isHidden = level >= opts.depth ? ' slide-up' : '';
      }
      nodeDiv.setAttribute('class', 'node ' + (nodeData.className || '') + isHidden);
      if (opts.draggable) {
        nodeDiv.setAttribute('draggable', 'true');
      }
      if (nodeData.parentId) {
        nodeDiv.setAttribute('data-parent', nodeData.parentId);
      }
      nodeDiv.innerHTML = `
        <div class="title">${nodeData[opts.nodeTitle]}</div>
        ${opts.nodeContent ? `<div class="content">${nodeData[opts.nodeContent]}</div>` : ''}
      `;
      // append 4 direction arrows or expand/collapse buttons
      const flags = nodeData.relationship || '';

      if (opts.verticalDepth && (level + 2) > opts.verticalDepth) {
        if ((level + 1) >= opts.verticalDepth && Number(flags.substr(2, 1))) {
          const toggleBtn = document.createElement('i');
          const icon = level + 1 >= opts.depth ? 'plus' : 'minus';

          toggleBtn.setAttribute('class', 'toggleBtn fa fa-' + icon + '-square');
          nodeDiv.appendChild(toggleBtn);
        }
      } else {
        if (Number(flags.substr(0, 1))) {
          const topEdge = document.createElement('i');

          topEdge.setAttribute('class', 'edge verticalEdge topEdge fa');
          nodeDiv.appendChild(topEdge);
        }
        if (Number(flags.substr(1, 1))) {
          const rightEdge = document.createElement('i');
          const leftEdge = document.createElement('i');

          rightEdge.setAttribute('class', 'edge horizontalEdge rightEdge fa');
          nodeDiv.appendChild(rightEdge);
          leftEdge.setAttribute('class', 'edge horizontalEdge leftEdge fa');
          nodeDiv.appendChild(leftEdge);
        }
        if (Number(flags.substr(2, 1))) {
          const bottomEdge = document.createElement('i');
          const symbol = document.createElement('i');
          const title = this._getQuerySelectorScope( nodeDiv, 'className', 'title' );

          bottomEdge.setAttribute('class', 'edge verticalEdge bottomEdge fa');
          nodeDiv.appendChild(bottomEdge);
          symbol.setAttribute('class', 'fa ' + opts.parentNodeSymbol + ' symbol');
          title.insertBefore(symbol, title.children[0]);
        }
      }
      nodeDiv.addEventListener('mouseenter', this._hoverNode.bind(this));
      nodeDiv.addEventListener('mouseleave', this._hoverNode.bind(this));
      nodeDiv.addEventListener('click', this._dispatchClickEvent.bind(this));
      if (opts.draggable) {
        nodeDiv.addEventListener('dragstart', this._onDragStart.bind(this));
        nodeDiv.addEventListener('dragover', this._onDragOver.bind(this));
        nodeDiv.addEventListener('dragend', this._onDragEnd.bind(this));
        nodeDiv.addEventListener('drop', this._onDrop.bind(this));
      }
      // allow user to append dom modification after finishing node create of orgchart
      if (opts.createNode) {
        opts.createNode(nodeDiv, nodeData);
      }

      resolve(nodeDiv);
    });
  }
  buildHierarchy(appendTo: any, nodeData: any, level: any, callback?) {
    // Construct the node
    const opts = this.options;
    let nodeWrapper;
    const childNodes = nodeData.children;
    const isVerticalNode = opts.verticalDepth && (level + 1) >= opts.verticalDepth;

    if (Object.keys(nodeData).length > 1) { // if nodeData has nested structure

      nodeWrapper = isVerticalNode ? appendTo : document.createElement('table');
      if (!isVerticalNode) {
        appendTo.appendChild(nodeWrapper);
      }

      this._createNode(nodeData, level)
      .then( (nodeDiv: any) => {
        if (isVerticalNode) {
          nodeWrapper.insertBefore(nodeDiv, nodeWrapper.firstChild);
        } else {

          const tr = document.createElement('tr');

          tr.innerHTML = `
            <td ${childNodes ? `colspan="${childNodes.length * 2}"` : ''}>
            </td>
          `;
          tr.children[0].appendChild( (nodeDiv) );

          nodeWrapper.insertBefore(tr, nodeWrapper.children[0] ? nodeWrapper.children[0] : null);
        }
        if (callback) {
          callback();
        }
      })
      .catch( (err) => {
        console.error('Failed to creat node', err);
      });
    }
    // Construct the inferior nodes and connectiong lines
    if (childNodes) {
      if (Object.keys(nodeData).length === 1) { // if nodeData is just an array
        nodeWrapper = appendTo;
      }
      let isHidden;
      const isVerticalLayer = opts.verticalDepth && (level + 2) >= opts.verticalDepth;
      const inEdit = this.chart.dataset.inEdit;

      if (inEdit) {
        isHidden = inEdit === 'addSiblings' ? '' : ' hidden';
      } else {
        isHidden = level + 1 >= opts.depth ? ' hidden' : '';
      }

      // draw the line close to parent node
      if (!isVerticalLayer) {

        const tr = document.createElement('tr');

        tr.setAttribute('class', 'lines' + isHidden);
        tr.innerHTML = `
          <td colspan="${ childNodes.length * 2 }">
            <div class="downLine"></div>
          </td>
        `;
        nodeWrapper.appendChild(tr);
      }
      // draw the lines close to children nodes
      const lineLayer = document.createElement('tr');

      lineLayer.setAttribute('class', 'lines' + isHidden);
      lineLayer.innerHTML = `
        <td class="rightLine">&nbsp;</td>
        ${childNodes.slice(1).map(() => `
          <td class="leftLine topLine">&nbsp;</td>
          <td class="rightLine topLine">&nbsp;</td>
          `).join('')}
        <td class="leftLine">&nbsp;</td>
      `;
      let nodeLayer;

      if (isVerticalLayer) {
        nodeLayer = document.createElement('ul');
        if (isHidden && level + 2 !== opts.verticalDepth) {
          nodeLayer.classList.add(isHidden.trim());
        }
        if (level + 2 === opts.verticalDepth) {
          const tr = document.createElement('tr');

          tr.setAttribute('class', 'verticalNodes' + isHidden);
          tr.innerHTML = `<td></td>`;
          tr.firstChild.appendChild(nodeLayer);
          nodeWrapper.appendChild(tr);
        } else {
          nodeWrapper.appendChild(nodeLayer);
        }
      } else {
        nodeLayer = document.createElement('tr');
        nodeLayer.setAttribute('class', 'nodes' + isHidden);

        nodeWrapper.appendChild(lineLayer);
        nodeWrapper.appendChild(nodeLayer);
      }

      // recurse through children nodes
      childNodes.forEach((child) => {
        let nodeCell;

        if (isVerticalLayer) {
          nodeCell = document.createElement('li');
        } else {
          nodeCell = document.createElement('td');
          nodeCell.setAttribute('colspan', 2);
        }
        nodeLayer.appendChild(nodeCell);
        this.buildHierarchy(nodeCell, child, level + 1, callback);
      });
    }
  }
  _clickChart(event) {
    const closestNode = this._closest(event.target, (el) => {
      return el.classList && el.classList.contains('node');
    });

    if (!closestNode && this.chart.querySelector('.node.focused')) {
      this.chart.querySelector('.node.focused').classList.remove('focused');
    }
  }
  _clickExportButton() {
    const opts = this.options;
    const chartContainer = this.chartContainer;
    let mask = this._getQuerySelectorScope(chartContainer, 'className', 'mask');
    const sourceChart = chartContainer.querySelector('.orgchart:not(.hidden)>table');
    const flag = opts.direction === 'l2r' || opts.direction === 'r2l';

    if ( opts && opts.exportCallback ) { opts.exportCallback(); }

    if ( !mask ) {
      mask = document.createElement('div');
      mask.setAttribute('class', 'mask');
      mask.innerHTML = `<i class="fa fa-circle-o-notch fa-spin spinner"></i>`;
      chartContainer.appendChild(mask);
    } else {
      mask.classList.remove('hidden');
    }
    chartContainer.classList.add('canvasContainer');
    this.html2canvas(sourceChart, {
      width: flag ? sourceChart.clientHeight : sourceChart.clientWidth,
      height: flag ? sourceChart.clientWidth : sourceChart.clientHeight,
      onclone: (cloneDoc) => {
        const canvasContainer = cloneDoc.querySelector('.canvasContainer');

        canvasContainer.style.overflow = 'visible';
        canvasContainer.querySelector('.orgchart:not(.hidden)').removeAttribute('style');
      },
    })
    .then((canvas) => {
      const downloadBtn = chartContainer.querySelector('.oc-download-btn');

      chartContainer.querySelector('.mask').classList.add('hidden');
      downloadBtn.setAttribute('href', canvas.toDataURL());

      if ( !this._checkBrowser() ) {
        downloadBtn.click();
      } else {
        window.navigator.msSaveBlob(canvas.msToBlob(), 'Orgchart.png');
      }

      chartContainer.classList.remove('canvasContainer');
      if ( opts && opts.endExportCallback ) { opts.endExportCallback(); }
    })
    .catch((err) => {
      console.error('Failed to export the curent orgchart!', err);
    });
  }
  _loopChart(chart) {
    const subObj: any = { id: chart.querySelector('.node').id };

    if (chart.children[3]) {
      Array.from(chart.children[3].children).forEach((el: any) => {
        if (!(subObj).children) { (subObj).children = []; }
        (subObj).children.push(this._loopChart( (el).firstChild));
      });
    }
    return subObj;
  }
  getHierarchy() {
    if (!this.chart.querySelector('.node').id) {
      return 'Error: Nodes of orghcart to be exported must have id attribute!';
    }
    return this._loopChart(this.chart.querySelector('table'));
  }
  _onPanStart(event) {
    const chart = this.chart;
    const chartContainer = event.currentTarget;

    if (this._closest(event.target, (el) => el.classList && el.classList.contains('node')) ||
      (event.touches && event.touches.length > 1)) {
      chart.dataset.panning = false;
      return;
    }
    chartContainer.style.cursor = 'move';
    chart.dataset.panning = true;

    let lastX = 0;
    let lastY = 0;
    const lastTf = window.getComputedStyle(chart).transform;

    if (lastTf !== 'none') {
      const temp = lastTf.split(',');

      if (!lastTf.includes('3d')) {
        lastX = Number.parseInt(temp[4], 10);
        lastY = Number.parseInt(temp[5], 10);
      } else {
        lastX = Number.parseInt(temp[12], 10);
        lastY = Number.parseInt(temp[13], 10);
      }
    }
    let startX = 0;
    let startY = 0;

    if (!event.targetTouches) { // pan on desktop
      startX = event.pageX - lastX;
      startY = event.pageY - lastY;
    } else if (event.targetTouches.length === 1) { // pan on mobile device
      startX = event.targetTouches[0].pageX - lastX;
      startY = event.targetTouches[0].pageY - lastY;
    } else if (event.targetTouches.length > 1) {
      return;
    }
    chart.dataset.panStart = JSON.stringify({ startX, startY });
    chartContainer.addEventListener('mousemove', this._onPanning.bind(this));
    chartContainer.addEventListener('touchmove', this._onPanning.bind(this));
  }
  _onPanning(event) {
    const chart = this.chart;

    if (chart.dataset.panning === 'false') {
      return;
    }
    let newX = 0;
    let newY = 0;
    const panStart = JSON.parse(chart.dataset.panStart);
    const startX = panStart.startX;
    const startY = panStart.startY;

    if (!event.targetTouches) { // pand on desktop
      newX = event.pageX - startX;
      newY = event.pageY - startY;
    } else if (event.targetTouches.length === 1) { // pan on mobile device
      newX = event.targetTouches[0].pageX - startX;
      newY = event.targetTouches[0].pageY - startY;
    } else if (event.targetTouches.length > 1) {
      return;
    }
    const lastTf = window.getComputedStyle(chart).transform;

    if (lastTf === 'none') {
      if (!lastTf.includes('3d')) {
        chart.style.transform = `matrix(1, 0, 0, 1, ${newX}, ${newY})`;
      } else {
        chart.style.transform = 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ' + newX + ', ' + newY + ', 0, 1)';
      }
    } else {
      const matrix: any = lastTf.split(',');

      if (!lastTf.includes('3d')) {
        matrix[4] = newX;
        matrix[5] = newY + ')';
      } else {
        matrix[12] = newX;
        matrix[13] = newY;
      }
      chart.style.transform = matrix.join(',');
    }
  }
  _onPanEnd(event) {
    const chart = this.chart;
    const chartContainer = this.chartContainer;

    if (chart.dataset.panning === 'true') {
      chart.dataset.panning = false;
      chartContainer.style.cursor = 'default';
      document.body.removeEventListener('mousemove', this._onPanning);
      document.body.removeEventListener('touchmove', this._onPanning);
    }
  }
  _setChartScale(chart, newScale) {
    const lastTf = window.getComputedStyle(chart).transform;

    if (lastTf === 'none') {
      chart.style.transform = 'scale(' + newScale + ',' + newScale + ')';
    } else {
      const matrix = lastTf.split(',');

      if (!lastTf.includes('3d')) {
        matrix[0] = 'matrix(' + newScale;
        matrix[3] = newScale;
        chart.style.transform = lastTf + ' scale(' + newScale + ',' + newScale + ')';
      } else {
        chart.style.transform = lastTf + ' scale3d(' + newScale + ',' + newScale + ', 1)';
      }
    }
    chart.dataset.scale = newScale;
  }
  _onWheeling(event) {
    event.preventDefault();

    const newScale = event.deltaY > 0 ? 0.8 : 1.2;

    this._setChartScale(this.chart, newScale);
  }
  _getPinchDist(event) {
    return Math.sqrt((event.touches[0].clientX - event.touches[1].clientX) *
      (event.touches[0].clientX - event.touches[1].clientX) +
      (event.touches[0].clientY - event.touches[1].clientY) *
      (event.touches[0].clientY - event.touches[1].clientY));
  }
  _onTouchStart(event) {
    const chart = this.chart;

    if (event.touches && event.touches.length === 2) {
      const dist = this._getPinchDist(event);

      chart.dataset.pinching = true;
      chart.dataset.pinchDistStart = dist;
    }
  }
  _onTouchMove(event) {
    const chart = this.chart;

    if (chart.dataset.pinching) {
      const dist = this._getPinchDist(event);

      chart.dataset.pinchDistEnd = dist;
    }
  }
  _onTouchEnd(event) {
    const chart = this.chart;

    if (chart.dataset.pinching) {
      chart.dataset.pinching = false;
      const diff = chart.dataset.pinchDistEnd - chart.dataset.pinchDistStart;

      if (diff > 0) {
        this._setChartScale(chart, 1);
      } else if (diff < 0) {
        this._setChartScale(chart, -1);
      }
    }
  }
  repositionChart(node = null) {
    let reset = false;
    let zoomX = 0;
    let zoomY = 0;

    if ( !node ) {
      let tr = this.chart.querySelector('.orgchart > table > tr');
      if ( !tr.classList.contains('hidden') ) {
        node = tr.querySelector('td > .node');
      }

      if ( !node ) {
        tr = this.chart.querySelector('.orgchart > table > tr.nodes');
        let found = false;

        while ( !found ) {
          const tmp = tr.querySelector('td:not(.hidden) > table > tr');
          if ( !tmp.classList.contains('hidden') ) {
            found = true;
            node = tmp.querySelector('td:not(.hidden) > div.node')
          } else {
            tr = tr.querySelector('table > tr.nodes');
          }
        }
      }

      reset = true;
      this.chart.style.transform = '';
    }else {
      const matrixCopy = this.chart.style.transform.replace(/^\w*\(/, '').replace(')', '');
      const matrixValue = matrixCopy.split(/\s*,\s*/);
      zoomX = matrixValue[0];
      zoomY = matrixValue[3];
      this.chart.style.transform = `matrix(${zoomX}, 0, 0, ${zoomY}, 0, 0)`;
    }

    const chartContainer = document.getElementById('chart-container');
    const chartBounding = chartContainer.getBoundingClientRect();

    const nodeBounding = node.getBoundingClientRect();

    const chartHalfX = chartBounding.left + (chartBounding.width / 2);
    const chartHalfY = chartBounding.top + (chartBounding.height / 2);
    const nodeX = (nodeBounding.left + (nodeBounding.width / 2));
    const nodeY = (nodeBounding.top + (nodeBounding.height / 2));

    const newX = nodeX - chartHalfX;
    const newY = nodeY - chartHalfY;

    if ( !reset ) {
      this.chart.style.transform = `matrix(${zoomX}, 0, 0, ${zoomY}, ${-newX}, ${-newY})`;
    } else {
      this.chart.style.transform = `matrix(1, 0, 0, 1, ${-newX}, ${-newY})`;
    }
  }
  resizeChart() {
    const chartContainer = document.getElementById('chart-container');
    const organigramContainer = document.getElementsByTagName('app-organigram-container');
    const marginBottom = organigramContainer[0] ? parseFloat(window.getComputedStyle(organigramContainer[0]).marginBottom) : 0;
    const chartBounding = chartContainer.getBoundingClientRect();
    const chartHeight = window.innerHeight - chartBounding.top - marginBottom;
    chartContainer.setAttribute( 'style', 'height: ' + chartHeight + 'px' );
  }
}

(window as any).OrgChart = OrgChart;
