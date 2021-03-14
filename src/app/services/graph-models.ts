export const EMPTY_GRAPH:IGraph = {
    datasource: undefined,
    labels: { nodes: [], edges: [] },
    nodes: [],
    edges: []
  };

  export interface IGraph {
    datasource: string;
    labels: ILabels;
    nodes: IElement[];
    edges: IElement[];
  };

  export interface ILabels {
    meta?: any;                     // { V:{ labelName: totalSize, ... }, E:{ ... }}
    nodes: ILabel[];                // { idx, name, size, total }
    edges: ILabel[];
  };

  export interface ILabel {
    idx: number,                    // desc by size
    name: string;
    size: number;
    total: number;                  // from meta
    elements?: IElement[];          // e.data.label = ${name}
    color?: string;                 // node: background-color, edge: target-arrow-color
  }

  export interface IElement {
    group: string;                  // group = {'nodes', 'edges'}
    data: {
      datasource: string;
      id: string;
      label: string;
      properties: any;              // default={}
      source?: string;              // for only EDGE
      target?: string;              // for only EDGE
    };
    position?: {                    // for only NODE
      x: undefined,
      y: undefined
    }
    scratch: {
      _idx?: number                 // for only NODE
      _color?: any;                 // node: color, edge: [sourceColor, targetColor]
      _label?: ILabel;
      _source?: IElement;           // for only EDGE
      _target?: IElement;           // for only EDGE
    };
  };
