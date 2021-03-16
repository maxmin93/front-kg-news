export interface Element {
    datasource: string
    timestamp: string;
    id: string;
    label: string;
    wdate?: Date;
}

export interface Sentence extends Element {
    seq: number;
    root: string;
    terms: string[];
}

export interface Term extends Element {
    sid: string;
    seq: number;
    head: string;
    text: string;
    p_tag: string;
    d_tag: string;
    e_tag: string;
}

export interface Document extends Element {
    title: string;
    content: string;
    provider: string;
    link: string;       // .split(" ")
    cate1?: string;
    cate2?: string;
    labels?: any;
}

export interface NewsResponse {
    hits: number;
    page_size: number;
    page_index: number;
    documents: Document[];
}
