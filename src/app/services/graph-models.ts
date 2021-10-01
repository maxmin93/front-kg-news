export const EMPTY_GRAPH:IGraph = {
    datasource: undefined,
    nodes: [],
    edges: []
};

export interface IGraph {
    datasource: string;
    nodes: IElement[];
    edges: IElement[];
};

export interface ILabels {
    nodes: ILabel[];                // { idx, name, size, total }
    edges: ILabel[];
};

export interface ILabel {
    name: string;
    elements?: IElement[];          // e.data.label = ${name}
    color?: string[];               // node: background-color, edge: target-arrow-color
}

export interface IElement {
    group: string;                  // group = {'nodes', 'edges'}
    data: {
        id: string;
        name: string;
        properties: any;              // default={}
        source?: string;              // for only EDGE
        target?: string;              // for only EDGE
    };
    position?: {                    // for only NODE
        x: undefined,
        y: undefined
    }
    scratch: {
        _color: string[];             // node: [color], edge: [sourceColor, targetColor]
        _index?: number               // for only NODE
        _source?: IElement;           // for only EDGE
        _target?: IElement;           // for only EDGE
    };
};

export interface IEvent {
    type: string;
    data: any;
};

//////////////////////////////////////

// dtriples, qtriples 에서 사용
export interface ITriple {
    id: string;
    sg_type: string;
    parent: string;
    cpoint?: string;
    head: string;
    subj: string[];
    pred: string;
    objs: string[];
    rest: string[];
    // 부가정보
    pred_stems: string[];
    subj_tokens: string[][];
    pred_tokens: string[][];
    objs_tokens: string[][];
    rest_tokens: string[][];
};

export interface ITripleNode {
    id: string;
    group: number;
    subj: any[];
    pred: string;
    objs: any[];
    rest: any[];
};

export interface ITripleEdge {
    from: string;
    to: string;
    group: number;
    joint: string[];
};
