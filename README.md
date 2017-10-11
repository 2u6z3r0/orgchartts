![OrgChart](http://dabeng.github.io/OrgChart.js/img/orgchart-heading.png)

# [Perhaps you'd prefer the jQuery version](http://github.com/dabeng/OrgChart)
# [Perhaps you'd prefer the Web Components version](http://github.com/dabeng/OrgChart-Webcomponents)
# [Perhaps you'd prefer the native javascript(ES6) version](http://github.com/dabeng/OrgChart.js)

## Foreword
- First of all, this is a porting to typescript of [dabeng](https://github.com/dabeng)'s great work -- [OrgChart.js](https://github.com/dabeng/OrgChart.js). So I've to thank him for that.
- Secondarily: I've extended the compatibility of this component to IE11/Edge and improved some issues related to zoom and pan.
- The rest of this readme it's a copy of the original one.
- Font Awesome provides us with administration icon, second level menu icon and loading spinner.

## Features
- Supports both local data and remote data (JSON).
- Smooth expand/collapse effects based on CSS3 transitions.
- Align the chart in 4 orientations.
- Allows user to change orgchart structure by drag/drop nodes.
- Allows user to edit orgchart dynamically and save the final hierarchy as a JSON object.
- Supports exporting chart as a picture.
- Supports pan and zoom
- Users can adopt multiple solutions to build up a huge organization chart(please refer to multiple-layers or hybrid layout sections)
- touch-enabled plugin for mobile divice

## Browser compatibility
- Chrome
- Firefox
- IE11
- Edge
- Safari

## Getting started
### Build
    npm install
    gulp build
### Serve
    gulp serve
Now, you can try out all the demos on http://localhost:3000.

**Note**: your nodejs version should be 4+.

## Usage

### Instantiation Statement
```js
let orgchart = new OrgChart(options);
```

### Structure of Datasource
```js
{
  'id': 'rootNode', // It's a optional property which will be used as id attribute of node
  // and data-parent attribute, which contains the id of the parent node
  'className': 'top-level', // It's a optional property which will be used as className attribute of node.
  'nodeTitlePro': 'Lao Lao',
  'nodeContentPro': 'general manager',
  'relationship': relationshipValue, // Note: when you activate ondemand loading nodes feature,
  // you should use json datsource (local or remote) and set this property.
  // This property implies that whether this node has parent node, siblings nodes or children nodes.
  // relationshipValue is a string composed of three "0/1" identifier.
  // First character stands for wether current node has parent node;
  // Scond character stands for wether current node has siblings nodes;
  // Third character stands for wether current node has children node.
  'children': [ // The property stands for nested nodes. "children" is just default name you can override.
    { 'nodeTitlePro': 'Bo Miao', 'nodeContentPro': 'department manager', 'relationship': '110' },
    { 'nodeTitlePro': 'Su Miao', 'nodeContentPro': 'department manager', 'relationship': '111',
      'children': [
        { 'nodeTitlePro': 'Tie Hua', 'nodeContentPro': 'senior engineer', 'relationship': '110' },
        { 'nodeTitlePro': 'Hei Hei', 'nodeContentPro': 'senior engineer', 'relationship': '110' }
      ]
    },
    { 'nodeTitlePro': 'Yu Jie', 'nodeContentPro': 'department manager', 'relationship': '110' }
  ],
  'otherPro': anyValue
};
```

### Options
<table>
  <thead>
    <tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>chartContainer</td><td>string</td><td>yes</td><td></td><td>selector usded to query the wrapper element of orgchart. It could be an id or an unique className.</td>
    </tr>
    <tr>
      <td>data</td><td>json or string</td><td>yes</td><td></td><td>datasource usded to build out structure of orgchart. It could be a json object or a string containing the URL to which the ajax request is sent.</td>
    </tr>
    <tr>
      <td>pan</td><td>boolean</td><td>no</td><td>false</td><td>Users could pan the orgchart by mouse drag&drop if they enable this option.</td>
    </tr>
    <tr>
      <td>zoom</td><td>boolean</td><td>no</td><td>false</td><td>Users could zoomin/zoomout the orgchart by mouse wheel if they enable this option.</td>
    </tr>
    <tr>
      <td>direction</td><td>string</td><td>no</td><td>"t2b"</td><td>The available values are t2b(implies "top to bottom", it's default value), b2t(implies "bottom to top"), l2r(implies "left to right"), r2l(implies "right to left").</td>
    </tr>
    <tr>
      <td>verticalDepth</td><td>integer</td><td>no</td><td></td><td>Users can make use of this option to align the nodes vertically from the specified depth.</td>
    </tr>
    <tr>
      <td>toggleSiblingsResp</td><td>boolean</td><td>no</td><td>false</td><td>Once enable this option, users can show/hide left/right sibling nodes respectively by clicking left/right arrow.</td>
    </tr>
    <tr>
      <td>ajaxURL</td><td>json</td><td>no</td><td></td><td>It inclueds four properites -- parent, children, siblings, families(ask for parent node and siblings nodes). As their names imply, different propety provides the URL to which ajax request for different nodes is sent.</td>
    </tr>
    <tr>
      <td>depth</td><td>positive integer</td><td>no</td><td>999</td><td>It indicates the level that at the very beginning orgchart is expanded to.</td>
    </tr>
    <tr>
      <td>nodeTitle</td><td>string</td><td>no</td><td>"name"</td><td>It sets one property of datasource as text content of title section of orgchart node. In fact, users can create a simple orghcart with only nodeTitle option.</td>
    </tr>
    <tr>
      <td>parentNodeSymbol</td><td>string</td><td>no</td><td>"fa-users"</td><td>Using font awesome icon to imply that the node has child nodes.</td>
    </tr>
    <tr>
      <td>nodeContent</td><td>string</td><td>no</td><td></td><td>It sets one property of datasource as text content of content section of orgchart node.</td>
    </tr>
    <tr>
      <td>nodeId</td><td>string</td><td>no</td><td>"id"</td><td>It sets one property of datasource as unique identifier of every orgchart node.</td>
    </tr>
    <tr>
      <td>createNode</td><td>function</td><td>no</td><td></td><td>It's a callback function used to customize every orgchart node. It recieves two parament: "$node" stands for jquery object of single node div; "data" stands for datasource of single node.</td>
    </tr>
    <tr>
      <td>exportButton</td><td>boolean</td><td>no</td><td>false</td><td>It enable the export button for orgchart.</td>
    </tr>
    <tr>
      <td>exportFilename</td><td>string</td><td>no</td><td>"Orgchart"</td><td>It's filename when you export current orgchart as a picture.</td>
    </tr>
    <tr>
      <td>chartClass</td><td>string</td><td>no</td><td>""</td><td>when you wanna instantiate multiple orgcharts on one page, you should add diffent classname to them in order to distinguish them.</td>
    </tr>
    <tr>
      <td>draggable</td><td>boolean</td><td>no</td><td>false</td><td>Users can drag & drop the nodes of orgchart if they enable this option. **Note**: this feature doesn't work on IE due to its poor support for HTML5 drag & drop API.</td>
    </tr>
    <tr>
      <td>dropCriteria</td><td>function</td><td>no</td><td></td><td>Users can construct their own criteria to limit the relationships between dragged node and drop zone. Furtherly, this function accept three arguments(draggedNode, dragZone, dropZone) and just only return boolen values.</td>
    </tr>
    <tr>
      <td>fullHeight</td><td>boolean</td><td>no</td><td></td><td>It sets the height of chartContainer to fullfil the window.</td>
    </tr>
  </tbody>
</table>

### Methods
I'm sure that you can grasp the key points of the methods below after you try out demo -- [edit orgchart](http://dabeng.github.io/OrgChart.js/edit-orgchart/).
##### let orgchart = new OrgChart(options);
Embeds an organization chart in designated container. Accepts an options object and you can go through the "options" section to find which options are required.
##### .addParent(root, data)
Adds parent node(actullay it's always root node) for current orgchart.
<table>
  <thead>
    <tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>root</td><td>dom node</td><td>yes</td><td>root node of designated orgchart</td><td>options used for overriding initial options</td></tr>
    <tr><td>data</td><td>json object</td><td>yes</td><td></td><td>datasource for building root node</td></tr>
  </tbody>
</table>
##### .addSiblings(node, data)
Adds sibling nodes for designated node.
<table>
  <thead>
    <tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>node</td><td>dom node</td><td>yes</td><td></td><td>we'll add sibling nodes based on this node</td></tr>
    <tr><td>data</td><td>json object</td><td>yes</td><td></td><td>datasource for building sibling nodes</td></tr>
  </tbody>
</table>
##### .addChildren(node, data）
Adds child nodes for designed node.
<table>
  <thead>
    <tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>node</td><td>dom node</td><td>yes</td><td></td><td>we'll add child nodes based on this node</td></tr>
    <tr><td>data</td><td>json object</td><td>yes</td><td></td><td>datasource for building child nodes</td></tr>
  </tbody>
</table>
##### .removeNodes(node）
Removes the designated node and its descedant nodes.
<table>
  <thead>
    <tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>node</td><td>dom node</td><td>yes</td><td></td><td>node to be removed</td></tr>
  </tbody>
</table>
##### .getHierarchy()
This method is designed to get the hierarchy relationships of orgchart for further processing. For example, after editing the orgchart, you could send the returned value of this method to server-side and save the new state of orghcart.
##### .hideChildren(node)
This method allows you to hide programatically the children of any specific node(.node element), if it has
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Required</th>
    <th>Default</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>node</td>
    <td>dom node</td>
    <td>Yes</td>
    <td>None</td>
    <td>It's the desired dom node that we'll hide its children nodes</td>
  </tr>
</table>
##### .showChildren(node)
This method allows you to show programatically the children of any specific node(.node element), if it has
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Required</th>
    <th>Default</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>node</td>
    <td>dom node</td>
    <td>Yes</td>
    <td>None</td>
    <td>It's the desired dom node that we'll show its children nodes</td>
  </tr>
</table>
##### .hideSiblings(node, direction)
This method allows you to hide programatically the siblings of any specific node(.node element), if it has
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Required</th>
    <th>Default</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>node</td>
    <td>dom node</td>
    <td>Yes</td>
    <td>None</td>
    <td>It's the desired dom node that we'll hide its siblings nodes</td>
  </tr>
  <tr>
    <td>direction</td>
    <td>string</td>
    <td>No</td>
    <td>None</td>
    <td>Possible values:"left","rigth". Specifies if hide the siblings at left or rigth. If not defined hide both of them.</td>
  </tr>
</table>
##### .showSiblings(node, direction)
This method allows you to show programatically the siblings of any specific node(.node element), if it has
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Required</th>
    <th>Default</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>node</td>
    <td>dom node</td>
    <td>Yes</td>
    <td>None</td>
    <td>It's the desired dom node that we'll show its siblings nodes</td>
  </tr>
  <tr>
    <td>direction</td>
    <td>string</td>
    <td>No</td>
    <td>None</td>
    <td>Possible values:"left","rigth". Specifies if hide the siblings at left or rigth. If not defined hide both of them.</td>
  </tr>
</table>
##### .getNodeState(node, relation)
This method returns you the display state of the related nodes.
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Required</th>
    <th>Default</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>node</td>
    <td>dom node</td>
    <td>Yes</td>
    <td>None</td>
    <td>It's the desired dom node that we wanna know its related nodes' display state.</td>
  </tr>
  <tr>
    <td>relation</td>
    <td>String</td>
    <td>Yes</td>
    <td>None</td>
    <td>Possible values: "parent", "children" and "siblings". Specifies the desired relation to return.</td>
  </tr>
</table>
The returning object will have the next structure:
```js
{
  "exists": true|false,  //Indicates if has parent|children|siblings
  "visible":true|false,  //Indicates if the related nodes are visible
}
```
##### .getRelatedNodes(node, relation)
This method returns you the nodes related to the specified node
<table>
  <tr>
    <th>Name</th>
    <th>Type</th>
    <th>Required</th>
    <th>Default</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>node</td>
    <td>dom node</td>
    <td>Yes</td>
    <td>None</td>
    <td>It's the desired that we wanna get its related nodes</td>
  </tr>
  <tr>
    <td>relation</td>
    <td>String</td>
    <td>Yes</td>
    <td>None</td>
    <td>Possible values: "parent", "children" and "siblings". Specifies the desired relation to return.</td>
  </tr>
</table>

### Events
<table>
  <thead>
    <tr><th>Event Type</th><th>Attached Data</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>nodedropped.orgchart</td><td>draggedNode, dragZone, dropZone</td><td>The event's handler is where you can place your customized function after node drop over. For more details, please refer to <a target="_blank" href="http://dabeng.github.io/OrgChart.js/drag-drop/">example drag & drop</a>.</td></tr>
  </tbody>
</table>
