export interface Element {
    datasource: string
    timestamp: number;
    id: string;
    label: string;
    wdate?: Date;
}

export interface Sentence extends Element {
    offset: number;
    text: string;
    // terms?: string[];
}

export interface Token extends Element {
    offset: number;                     // text.begin_offset (byte 기준)
    text: string;                       // text.content
    head_tid: string;                   // head_token_index
    edge_tag: string;                   // dependency_edge.label.name (82종), ex) NN, ROOT
    // PartOfSpeech(12종): tag(=label), aspect, case, form, gender, mood, number, person, proper, reciprocity, tense, voice
    pos_types: Map<string,string>;
    s_idx: number;                      // sentence index

    entity?: [string,string,string];    // entity: (label, name, comment)
}

export interface Document extends Element {
    content: string;
    title?: string;
    category?: string;
    provider?: string;
    reporter?: string;
    out_link?: string;
}

export interface NewsResponse {
    documents: Document[];
    hits: number;
    page_size: number;
    page_index: number;
}
