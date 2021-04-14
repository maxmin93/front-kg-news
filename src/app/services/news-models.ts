export interface Element {
    timestamp: number;
    datasource: string
    id: string;
    label: string;
    wdate?: Date;
}

export interface Sentence extends Element {
    s_idx: number;
    text: string;
    offset: number;
}

export interface Token extends Element {
    s_idx: number;                      // sentence index
    t_idx: number;                      // token index
    text: string;                       // text.content
    offset: number;                     // text.begin_offset (byte 기준)
    head_tid: string;                   // head_token_index
    edge_tag: string;                   // dependency_edge.label.name (82종), ex) NN, ROOT
    // PartOfSpeech(12종): tag(=label), aspect, case, form, gender, mood, number, person, proper, reciprocity, tense, voice
    pos_types: string;                  // Map<string,string>;

    entity?: string;                    // [string,string,string];    // entity: (label, name, comment)
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
