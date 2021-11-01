import { Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { WordsApiService } from 'src/app/services/words-api.service';
import { DocsApiService } from 'src/app/services/docs-api.service';
import { UiApiService } from '../../services/ui-api.service';

import { ITripleNode, ITripleEdge } from 'src/app/services/graph-models';

// **NOTE: You don't need to install vis-data. (standalone)
// https://stackoverflow.com/a/60937676
// https://tillias.wordpress.com/2020/10/11/visualize-graph-data-using-vis-network-and-angular/
import { Node, Edge, Network } from "vis-network/standalone/esm/vis-network"
import { DataSet } from "vis-network/standalone/esm/vis-network"
// npm i vis-data --save-dev

import { MatDialog } from '@angular/material/dialog';
import { VocabDialogComponent } from './vocab-dialog/vocab-dialog.component';


@Component({
  selector: 'app-n2v-browser',
  templateUrl: './n2v-browser.component.html',
  styleUrls: ['./n2v-browser.component.scss']
})
export class N2vBrowserComponent implements OnInit, OnDestroy, AfterViewInit {

    positives: string[] = [];
    negatives: string[] = [];
    topN: number = 30;
    threshold: number = 0.40;
    sizeOfSubGraphs: number = 5;
    messageOfSubGraph: string = undefined;

    mainGraph: any;
    triplesGraph: any;
    subGraphs: any[];
    segments: Map<string,any>;

    @ViewChild('mainVisContainer', {static: false}) private mainVisContainer: ElementRef;
    // @ViewChild('subVisContainers', {static: false}) private subVisContainers: ElementRef;
    @ViewChild('triplesVisContainer', {static: false}) private triplesVisContainer: ElementRef;

    apiSwitch: boolean = true;      // true: node2vec, false: word2vec
    formWords = new FormGroup({
        positives: new FormControl('', [ Validators.pattern('([^,\s]+)') ]),
        negatives: new FormControl('', [ Validators.pattern('([^,\s]+)') ]),
        threshold: new FormControl(this.threshold, [ Validators.min(0.5), Validators.max(1.0) ]),
    });

    pivot: string;
    entity_pivots: any;     // N2vDialog { label: [[noun, tf, df, tfidf], ..], }
    words: Set<string>;     // unique synonyms 유지 (확장시 체크)

    debug: boolean = false;
    handler_pivots:Subscription;
    handler_graph:Subscription;

    // @ViewChild('tippy_test', {static: false}) private tippy_test: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private wordsService: WordsApiService,
        private docsService: DocsApiService,
        // private colorService: ColorProviderService,
        public pivotsDialog: MatDialog
    ) { }

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);
        });
        // parameters of routes
        this.route.paramMap.subscribe(params => {
            if( params.has('pivot') ){
                this.pivot = params.get('pivot');
                console.log('pivot:', this.pivot);
                if( this.pivot ){
                    this.formWords.setValue({positives: this.pivot, negatives: '', threshold: this.threshold});
                    this.positives = [ this.pivot ];
                    this.negatives = [];
                    this.load_words_graph();
                }
            }
        });
        this.route.queryParams.subscribe(params => {
            this.debug = params['debug'];
        });

        // get data
        this.handler_pivots = this.getN2vPivots();
    }

    ngAfterViewInit(): void{
        // this.sizeOfSubGraphs = this.subVisContainers.nativeElement.children.length;
        // this.subGraphs = new Array(this.sizeOfSubGraphs);
    }

    ngOnDestroy(): void{
        if(this.handler_pivots) this.handler_pivots.unsubscribe();
        // if(this.handler_synonyms) this.handler_synonyms.unsubscribe();
        if(this.handler_graph) this.handler_graph.unsubscribe();

        // destory VisNetwork objects
        if( this.mainGraph ){
            console.log('mainGraph.destroy:', this.mainGraph);
            this.mainGraph.destroy();
            this.mainGraph = null;
        }
        this.vis_destroy_subgraphs();
    }

    vis_destroy_subgraphs(){
        // for(let sg_idx=0; sg_idx<this.sizeOfSubGraphs; sg_idx+=1){
        //     if( this.subGraphs[sg_idx] ){
        //         this.subGraphs[sg_idx].destroy();
        //         this.subGraphs[sg_idx] = undefined;
        //         this.messageOfSubGraph = undefined;
        //     }
        // }
        if( this.triplesGraph ){
            this.triplesGraph.destroy();
            this.triplesGraph = undefined;
            this.messageOfSubGraph = undefined;
        }
    }

    load_words_graph(){
        // destory VisNetwork objects
        if( this.mainGraph !== undefined ){
            this.mainGraph.destroy();
            this.mainGraph = undefined;
            this.vis_destroy_subgraphs();
        }
        if( this.positives.length > 0 ){
            this.handler_graph = this.getWordsGraph(this.positives, this.negatives, this.topN, this.threshold);
        }
    }

    onSubmit(){
        console.log(`submit: positives="${this.formWords.get('positives').value}", negatives="${this.formWords.get('negatives').value}"`);
        if( this.formWords.get('positives').value.length > 0 ){
            this.positives = this.formWords.get('positives').value.trim().length > 0 ? this.formWords.get('positives').value.split(' ') : [];
            this.negatives = this.formWords.get('negatives').value.trim().length > 0 ? this.formWords.get('negatives').value.split(' ') : [];
            this.threshold = this.formWords.get('threshold').value;
            this.load_words_graph();
        }
    }

    onClickSubG(idx:number){
        if( this.subGraphs[idx] ){
            // console.log('sg.size=', this.subGraphs[idx]['_sg_size']);
            this.messageOfSubGraph = `(G[${idx}].size = ${this.subGraphs[idx]['_sg_size']})`;
        }
        else{
            this.messageOfSubGraph = undefined;
        }
    }

    changeApiMode(){
        this.apiSwitch = !this.apiSwitch;
        // console.log('apiType changed:', this.apiSwitch);
        if( this.positives.length > 0 ){
            this.load_words_graph();
        }
    }


    //////////////////////////////////////////////
    //  APIs
    //

    // Dialog 에서 사용
    // return: { entity: [[noun, tf, df, tfidf], ..], }
    getN2vPivots(): Subscription{
        return this.wordsService.getStatTfidfOfEntities().subscribe(x=>{
            this.entity_pivots = x;
        });
    }

    // return: { pivot, nodes[], edges_syn[], edges_fof[] }
    getWordsGraph(positives: string[], negatives: string[]=[], topN: number=20, threshold: number=0.65): Subscription{
        if( this.apiSwitch ){
            return this.wordsService.getN2vWordsGraph(positives, negatives, topN, threshold).subscribe(x=>{
                // console.log('graph data:', x);
                this.mainGraph = this.vis_main_graph(x);
            });
        }
        else{
            return this.wordsService.getW2vWordsGraph(positives, negatives, topN, threshold).subscribe(x=>{
                // console.log('graph data:', x);
                this.mainGraph = this.vis_main_graph(x);
            });
        }
    }


    //////////////////////////////////////////////
    //  TFIDF Dialog
    //

    openDialog() {
        const dialogRef = this.pivotsDialog.open(VocabDialogComponent, {
            width : '800px',
            height: '740px',
            data: this.entity_pivots
        });

        dialogRef.afterClosed().subscribe(result => {
            if( result ){
                console.log('Dialog closed:', result);
                this.pivot = result['noun'];
                this.formWords.setValue({positives: this.pivot, negatives: '', threshold: this.threshold});
                this.positives = [ this.pivot ];
                this.negatives = [];
                this.load_words_graph();
        }
        });
    }


    ////////////////////////////////////////////////////

    vis_main_graph(x: any){
        if(!x) return;

        let pivot = `${this.positives.join("+")}`;
        if( this.negatives.length > 0 ) pivot += `\n-(${this.negatives.join(",")})`;

        // id: number or string
        let nodes_data = new DataSet<any>([{ id: 0, label: pivot, group: 0, shape: "box" }], {});
        let edges_data = new DataSet<any>([], {});

        this.segments = new Map(x['segments']);
        console.log('matched:', this.segments );

        // neighbors
        let order = 1;
        for(let nbr of x['neighbors']){
            nodes_data.add({ id: order, label: nbr[0], group: 1 });     // label 있으면 size 조정 안됨
            let sg_size = this.segments.has(nbr[0]) ? Object.keys(this.segments.get(nbr[0])).length : 0;
            edges_data.add({
                from: 0, to: order, arrows: {to: {enabled: true}},
                // width: 1+2*Math.log10(sg_size+1),    // sg 개수만큼 line 굵게 그리기
                width: sg_size + 1,                     // sg 개수만큼 line 굵게 그리기
                dashes: (sg_size>0) ? false : true,     // sg 가 하나도 없으면 dash-line
                label: `${nbr[1].toFixed(4)}`, font: { align: "middle" }
            });
            // console.log(`** edge[${order}]:`, nbr[0], sg_size, '==>', 1+2*Math.log10(sg_size+1));
            order += 1;
        }

        // create a network
        let container = this.mainVisContainer.nativeElement;
        let data = { nodes: nodes_data, edges: edges_data };
        // styles
        let options = {
            nodes: {
                font: { size: 11, face: 'arial', },
            },
            edges: {
                // width 관련 설정하면 edge label 이 wrap 처리됨 (오류)
                // width: 1, widthConstraint: { maximum: 10 },
                font: { size: 11, align: "middle" },
                arrows: { to: { type: 'arrow', scaleFactor:0.5 }, },
            },
            physics: {
                enabled: true      // true
            },
            layout: {
                randomSeed: 0,
            }
        };

        // initialize your network!
        let network = new Network(container, data, options);

        // event: selectNode 를 설정해도 selectEdge 가 같이 fire 됨 (오류!)
        network.on("select", (params)=>{
            if( params.nodes.length > 0 ){
                // target: nodes
                let target = nodes_data.get(params.nodes[0]);
                console.log("Selection Node:", target);
                if( this.segments.has(target["label"]) ){
                    let sg_terms: string[] = [...x['positives']];
                    sg_terms.push( target["label"] );   
                    // 클릭된 단어가 포함된 sg_id 리스트
                    let sg_list = Object.keys(this.segments.get( target["label"] ));
                    let matched = Object.values(this.segments.get( target["label"] )).reduce((acc:string[], val:string[]) => acc.concat(val), []);
                    // let matched_size = Object.values(this.segments.get( target["label"] )).reduce((sum:number,curr:string[])=>sum + curr.length, 0) ;
                    console.log(`${sg_terms}: sg_list=${sg_list.length}`, matched as string[]);

                    // message 출력
                    this.messageOfSubGraph = `TERMS=[ ${x['positives'].join(',')} ]&[ ${target["label"]} ], SG.size=${sg_list.length}`;
                    this.messageOfSubGraph += ` (Triples.size=${(matched as string[]).length})`;

                    // 1) 해당 sg_list 의 triples 를 불러서 subgraphs를 그리고 (최대 5개)
                    // 2) sg_terms 의 단어들을 강조 표시
                    this.docsService.getTriplesGraphBySgListWithTerms(sg_list, matched as string[]).subscribe(x=>{
                        console.log('response:', x);    // roots, nodes, edges, options
                        if( x.hasOwnProperty('options') && x['options'].hasOwnProperty('docids') ){
                            this.messageOfSubGraph += ` ==> [ ${x['options']['docids'].join(' , ')} ]`;
                        }
                        this.triplesGraph = this.vis_triples_graph(x['roots'], x['nodes'], x['edges'], x['options'], this.segments.get( target["label"] ));
                    });
                }
                else{
                    this.vis_destroy_subgraphs();
                }
            }
            // select 가 nodes 에 반응하지 않은 경우만 edges 처리
            else if( params.edges.length > 0 ){
                console.log("Selected Edges:", params.edges);
            }
        });
        // event: doubleClick
        network.on("doubleClick", (params)=>{
            if( params.nodes.length > 0 ){
                console.log("doubleClick:", nodes_data.get(params.nodes[0]));
                this.pivot = nodes_data.get(params.nodes[0])["label"];
                this.formWords.setValue({positives: this.pivot, negatives: '', threshold: this.threshold});
                this.positives = [ this.pivot ];
                this.negatives = [];
                this.load_words_graph();
            }
        });

        return network;
    }

    vis_text_coloring(tokens: any[]){
        let result = []
        for(let t of tokens){
            let text = t[0];
            let entities = [... new Set(t[1]) ];   // list of unique values
            let ordered_entities = entities.sort((a:string, b:string)=>{
                return b.length - a.length;
            });                                     // sort by length (desc)
            for(let e of ordered_entities){
                let e_re = new RegExp(`(^|[^>])(${e})([^<]|$)`, "g");
                text = text.replace(e_re, "$1<i>$2</i>$3");
            }
            result.push(text);
        }
        return result;
    }

    // matched = this.segments.get( target["label"] )
    vis_triples_graph(roots: any, nodes: any[], edges: any[], g_options: any, matched: any){
        let nodes_data = new DataSet<any>([]);
        let edges_data = new DataSet<any>([]);

        // root
        for(const [key, value] of Object.entries(roots)){
            // const s_idx = Number(key);
            const root_key = key;    // this.rootID(s_idx);
            nodes_data.add({
                id: root_key, label: `<b>ROOT${root_key.split('_')[1]}</b>`, group: root_key,
                shape: "circle", borderWidth: 2, margin: 5,
                color: { border: 'black', background: 'white' },
                font: { align: 'center' },
            });
            edges_data.add({
                from: value, to: root_key, group: root_key, label: '', dashes: true
            });
        }

        // let matched = g_options.hasOwnProperty('matched') ? g_options['matched'] : [];
        let sg_paths = g_options.hasOwnProperty('sg_paths') ? g_options['sg_paths'] : {} as any;;

        // nodes
        for(let data of nodes){
            const t = data as ITripleNode;
            // VERB 의 기본형
            let stems = (t.pred[1].length == 0 || t.pred[0].replace(' ','') == t.pred[1].join(''))
                        ? "" : `(${ t.pred[1].join('|') })`;
            // Triple 라벨
            let label_value =
                `<b>S:</b> [ ${ this.vis_text_coloring(t.subj).join('|') } ]\n`
                + `<b>P:</b> <b><i>${t.pred[0]}</i></b>${stems}\n`
                + `<b>O:</b> [ ${ this.vis_text_coloring(t.objs).join('|') } ]\n`
                + `<b>C:</b> [ ${ this.vis_text_coloring(t.rest).join('|') } ]`;
            nodes_data.add({
                id: t.id, label: label_value, group: t.group, shape: "box", margin: 5
                , borderWidth: t.group in matched && matched[t.group].includes(t.id) ? 3 : 1
                // color 를 설정하면 group 에 의한 스타일 자동 설정이 해제됨
                // , color: matched.includes(t.id) ? { border: 'darkred' } : {}
                // , hidden: t.group in sg_paths && sg_paths[t.group].includes(t.id) ? false : true
            });
        }
        // edges
        for(let data of edges){
            const e = data as ITripleEdge;
            let label_value = `${e.joint[0]}`;
            edges_data.add({
                from: e.from, to: e.to, group: e.group, label: label_value
                , width: e.group in sg_paths && sg_paths[e.group].includes(e.from) && sg_paths[e.group].includes(e.to) ? 3 : 1
                , dashes: e.group in sg_paths && sg_paths[e.group].includes(e.from) && sg_paths[e.group].includes(e.to) ? false : true
            });
        }

        // create a network
        let container = this.triplesVisContainer.nativeElement;
        let data = { nodes: nodes_data, edges: edges_data };

        // styles
        let options = {
            nodes: {
                // https://stackoverflow.com/a/51777791
                font: {
                    size: 11, face: 'arial', multi: 'html', align: 'left'
                    , bold: '12px courier black'
                    , ital: '11px arial darkred'
                    , boldital: '12px arial darkblue'
                }
            },
            edges: {
                // width 관련 설정하면 edge label 이 wrap 처리됨 (오류)
                // width: 1, widthConstraint: { maximum: 10 },
                font: { size: 11, align: "middle" },
                arrows: { to: { type: 'arrow', enabled: true, scaleFactor: 0.5 }, },
            },
            physics: {
                // enabled: true,
                hierarchicalRepulsion: { avoidOverlap: 1, },
            },
            // https://visjs.github.io/vis-network/docs/network/layout.html
            layout: {
                improvedLayout: true,
                hierarchical: { enabled: true, direction: 'UD', nodeSpacing: 10, treeSpacing: 20 },
            },
        };

        // initialize your network!
        let network = new Network(container, data, options);
        window['vis'] = network;

        // event: selectNode 를 설정해도 selectEdge 가 같이 fire 됨 (오류!)
        network.on("select", (params)=>{
            if( params.nodes.length > 0 ){
                let target = nodes_data.get(params.nodes[0]);
                console.log("Selection Node:", target);
                // pass
            }
            // select 가 nodes 에 반응하지 않은 경우만 edges 처리
            else if( params.edges.length > 0 ){
                // console.log("Selected Edges:", params.edges);
            }
        });
        // event: doubleClick
        network.on("doubleClick", (params)=>{
            if( params.nodes.length > 0 ){
                let target = nodes_data.get(params.nodes[0]);
                console.log("doubleClick:", target);
                // pass
            }
        });

        return network;
    }

    /*
    vis_subgraphs(sg_pivots: string[], sg_list:any[]){
        // clear
        this.vis_destroy_subgraphs();

        let sg_idx = 0;
        for(let sg of sg_list){
            let nodes = new DataSet<any>();
            let edges = new DataSet<any>();

            for( let i=0; i<sg['sg_nodes'].length; i+=1 ){
                let token = sg['sg_nodes'][i];
                nodes.add({
                    id: i,
                    label: token + (sg['sg_entities'][i] ? `\n<${sg['sg_entities'][i].toLowerCase()}>` : ''),
                    color: { background: (sg_pivots.includes(token) ? '#D2E5FF' : 'orange') }
                });
                if(sg['sg_type'] == 'chain'){
                    if(i > 0){
                        edges.add({ from: i-1, to: i, label: sg['sg_dtags'][i-1] });
                    }
                }
                else{
                    if(i < sg['sg_nodes'].length-1){
                        edges.add({ from: i, to: sg['sg_nodes'].length-1, label: sg['sg_dtags'][i] });
                    }
                }
            }
            let root = sg['sg_nodes'].length - 1;
            nodes.get(root)['borderWidth'] = 3;     // root 노드 강조!

            // create a network
            let container = this.subVisContainers.nativeElement.children[sg_idx];
            let options = {
                edges: {
                    arrows: { to: {enabled: true, type: 'arrow', scaleFactor: 0.5} },
                },
                layout: {
                    randomSeed: root,
                },
            };
            this.subGraphs[sg_idx] = new Network(container, {nodes: nodes, edges: edges}, options);
            this.subGraphs[sg_idx]['_sg_size'] = sg['size'];    // user data

            // next
            sg_idx += 1;
            if( sg_idx > this.sizeOfSubGraphs ) break;
        }
    }
    */

}

/*
    vis_subgraphs(sg_pivots: string[], sg_list:any[]){
        // clear
        this.vis_destroy_subgraphs();

        // sg_list 안에 variant 들이 있고, 그것까지 모두 그린다
        let sg_idx = 0;
        for(let sg of sg_list){
            for(let i=0; i<sg['sg_nodes'].length; i+=1){
                let t_nodes = sg['sg_nodes'][i];
                let t_edges = sg['sg_edges'][i];
                let t_labels = sg['entities'][i];
                let t_counter: Map<string,number> = new Map();

                // nodes data
                let nodes = new vis.DataSet();
                let e_idx = 0;
                for(let t of t_nodes){
                    if( !t_counter.has(t) ){
                        t_counter.set(t, 0);
                        nodes.add({
                            id: t,
                            label: t + (t_labels[e_idx] ? `\n<${t_labels[e_idx].toLowerCase()}>` : ''),
                            color: { background: (sg_pivots.includes(t) ? '#D2E5FF' : 'orange') }
                        });
                    }
                    e_idx += 1;
                }

                // edges data
                let edges = new vis.DataSet();
                for(let t of t_edges){
                    let t_splited = t.split(',')
                    if( t_splited.length == 2 ){
                        // t_counter.set(t_splited[0],  t_counter.get(t_splited[0])+1);
                        t_counter.set(t_splited[1],  t_counter.get(t_splited[1])+1);
                        edges.add({ from: t_splited[0], to: t_splited[1] });
                    }
                }
                let max_count = Math.max(...t_counter.values());
                let root = [...t_counter.keys()][t_counter.size-1];     // sg_type='single'
                if( max_count > 1 ){                                    // sg_type='joint'
                    t_counter.forEach((value, key) => {
                        if (value === max_count) root = key;
                    });
                }
                // console.log('** root:', root, '<== nodes=', t_nodes, ', edges=', t_edges);
                nodes.get(root)['borderWidth'] = 2;     // root 노드 강조!

                //////////////////////////////

                // create a network
                let container = this.subVisContainers.nativeElement.children[sg_idx];
                let options = {
                    edges: {
                        arrows: { to: {enabled: true, type: 'arrow', scaleFactor: 0.5} },
                    },
                    layout: {
                        randomSeed: root,
                    }
                };
                this.subGraphs[sg_idx] = new vis.Network(container, {nodes: nodes, edges: edges}, options);

                // next
                sg_idx += 1;
                if( sg_idx >= this.sizeOfSubGraphs ) break;
            }
            if( sg_idx >= this.sizeOfSubGraphs ) break;
        }
    }
*/
