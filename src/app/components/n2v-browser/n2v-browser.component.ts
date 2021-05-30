import { Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { WordsApiService } from 'src/app/services/words-api.service';
import { UiApiService } from '../../services/ui-api.service';
import { ColorProviderService } from '../../services/color-provider.service';

declare const vis:any;

import { ILabel, IElement, IGraph } from '../../services/graph-models';

import { MatDialog } from '@angular/material/dialog';
import { W2vDialogComponent } from '../w2v-browser/w2v-dialog/w2v-dialog.component';


@Component({
  selector: 'app-n2v-browser',
  templateUrl: './n2v-browser.component.html',
  styleUrls: ['./n2v-browser.component.scss']
})
export class N2vBrowserComponent implements OnInit, OnDestroy, AfterViewInit {

    positives: string[] = ['여름','휴가'];   //,'박근혜'];
    negatives: string[] = [];
    topN: number = 50;
    threshold: number = 0.60;
    sizeOfSubGraphs: number = 5;

    mainGraph: any;
    subGraphs: any[] = new Array(this.sizeOfSubGraphs);
    segments: Map<string,any>;

    @ViewChild('mainVisContainer', {static: false}) private mainVisContainer: ElementRef;
    @ViewChild('subVisContainers', {static: false}) private subVisContainers: ElementRef;

    subgraphs = [
        {name: 'subg1'},
        {name: 'subg2'},
        {name: 'subg3'},
        {name: 'subg4'},
        {name: 'subg5'},
    ];

    showSearch: boolean = false;
    searchStr: string;

    pivot: string;
    pivots: any;            // N2vDialog { label: [[noun, tf, df, tfidf], ..], }
    words: Set<string>;     // unique synonyms 유지 (확장시 체크)
    graph: IGraph;

    debug: boolean = false;
    handler_pivots:Subscription;
    // handler_synonyms:Subscription;   // 사용 안함
    handler_graph:Subscription;

    @ViewChild('tippy_test', {static: false}) private tippy_test: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private wordsService: WordsApiService,
        private colorService: ColorProviderService,
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
        this.load_words_graph();
    }

    ngOnDestroy(): void{
        if(this.handler_pivots) this.handler_pivots.unsubscribe();
        // if(this.handler_synonyms) this.handler_synonyms.unsubscribe();
        if(this.handler_graph) this.handler_graph.unsubscribe();

        // destory VisNetwork objects
        if( this.mainGraph !== null ){
            this.mainGraph.destroy();
            this.mainGraph = null;
        }
        this.vis_destroy_subgraphs();
    }

    vis_destroy_subgraphs(){
        for(let sg_idx=0; sg_idx<this.sizeOfSubGraphs; sg_idx+=1){
            if( this.subGraphs[sg_idx] ){
                this.subGraphs[sg_idx].destroy();
                this.subGraphs[sg_idx] = undefined;
            }
        }
    }

    load_words_graph(){
        this.handler_graph = this.getN2vWordsGraph(this.positives, this.negatives, this.topN, this.threshold);
    }


    //////////////////////////////////////////////
    //  APIs
    //

    // Dialog 에서 사용
    // return: { entity: [[noun, tf, df, tfidf], ..], }
    getN2vPivots(): Subscription{
        return this.wordsService.getStatTfidfOfEntities().subscribe(x=>{
            this.pivots = x;
        });
    }

    // return: { pivot, nodes[], edges_syn[], edges_fof[] }
    getN2vWordsGraph(positives: string[], negatives: string[]=[], topN: number=20, threshold: number=0.65): Subscription{
        return this.wordsService.getN2vWordsGraph(positives, negatives, topN, threshold).subscribe(x=>{
            console.log('graph data:', x);
            this.mainGraph = this.vis_graph(x);

            // this.positives = x['positives'];
            // this.negatives = x['negatives'];
            // this.graph = this.makeGraph(x);
        });
    }


    //////////////////////////////////////////////
    //  TFIDF Dialog
    //

    searchToggle(value:boolean){
        this.showSearch = value;
    }

    searchSubmit(searchStr: string){
        console.log('searchStr:', searchStr);
        this.searchToggle(false);

        this.pivot = searchStr.trim();
    }

    receiveUserEvent(event){
        console.log('userEvent:', event);
        if( event._type == 'dbl-click' ){
            this.searchSubmit(event.data['name']);
        }
        else if( event._type == 'click' ){
            // this.getN2vGraphExtend(event.data['name']);
        }
    }

    openDialog() {
        const dialogRef = this.pivotsDialog.open(W2vDialogComponent, {
            width : '800px',
            height: '740px',
            data: this.pivots
        });

        dialogRef.afterClosed().subscribe(result => {
            if( result ){
                this.searchStr = result.noun;
                this.searchSubmit(this.searchStr);
            }
        });
    }

    ////////////////////////////////////////////////////

/*
    vis_graph(x: any){
        if(!x) return;

        let pivot = `${this.positives.join("+")}`;
        if( this.negatives.length > 0 ) pivot += `\n-(${this.negatives.join(",")})`;

        // id: number or string
        let nodes_data = new vis.DataSet([{ id: 0, label: pivot, group: 0, shape: "box" }], {});
        let edges_data = new vis.DataSet([], {});
        // console.log(nodes_data.get(0));

        let segments = x['segments'];
        let sgMap: Map<string,any> = new Map();
        let order = 1;

        // neighbors
        for(let nbr of x['neighbors']){
            nodes_data.add({ id: order, label: nbr[0], group: 1, borderWidth: nbr[1] });
            if( segments.hasOwnProperty(nbr[0]) ){
                for(let sg of segments[ nbr[0] ]){
                    let _id = nbr[0]+'_'+sg['id'];      // can be duplicated!
                    sgMap.set(_id, sg);
                    nodes_data.add({ id: _id, label: sg['name'], group: 2 });
                    edges_data.add({ from: order, to: _id, weight: sg['size'] });
                }
            }
            edges_data.add({ from: 0, to: order, arrows: {to: {enabled: true}} });
            order += 1;
        }


        // nbr_edges : 정보성 낮고, 너무 어지럽다 (1132개)
        // let limit = 50;
        // for(let nbrs of x['nbr_edges']){
        //     edges_data.add({ from: idMap.get(nbrs[0]), to: idMap.get(nbrs[1]), weight: nbrs[2] });
        //     if((--limit) == 0) break;
        // }

        // create a network
        let container = this.mainVisContainer.nativeElement;    // document.getElementById('vis-network');
        // provide the data in the vis format
        let data = {
            nodes: nodes_data,
            edges: edges_data
        };
        // styles
        let options = {
            nodes: {
                borderWidth:1,
                size:45,
                font:{
                    color:'black',
                    size: 11,
                    face :'arial',
                },
            },
            edges: {
                arrows: {
                    to:     {enabled: false, type: 'arrow', scaleFactor:0.5},
                    from:   {enabled: false, scaleFactor:1}
                },
                font: {
                    color: '#343434',
                    size: 11, // px
                    face: 'arial',
                    background: 'none',
                    strokeWidth: 5, // px
                    strokeColor: '#ffffff',
                    align: 'top'
                },
                smooth: {
                    enabled: false,     //setting to true enables curved lines
                    // type: "dynamic",
                    // roundness: 0.5
                },
            },
        };

        // initialize your network!
        let network = new vis.Network(container, data, options);
        network.setOptions({
            physics: { enabled: true },
            layout: {
                randomSeed: 0,
            }
        });

        // add event listeners
        network.on("select", (params)=>{
            if(params.nodes.length > 0) console.log("Selection:", params.nodes);
            if( params.nodes.length == 1 ){
                if( nodes_data.get(params.nodes[0]).group == 2 ){
                    let sg = sgMap.get(params.nodes[0]);
                    console.log('sg:', sg['name'], sg['sg_type'], sg['sg_nodes']);
                    this.vis_subgraphs(sg['sg_type'], sg['sg_nodes']);
                }
            }
        });

        return network;
    }

    vis_subgraphs(sg_type:string[], sg_nodes: string[][]){
        // clear
        this.vis_destroy_subgraphs();

        let sg_idx = 0;
        for(let sg of sg_nodes){
            let nodes = new vis.DataSet();
            let edges = new vis.DataSet();
            if(sg_type[0] == 'single'){
                for( let i=0; i<sg.length; i+=1 ){
                    nodes.add({ id: i, label: sg[i] }); //, color: { background: 'lightcyan'} });
                    if(i > 0) edges.add({ from: i-1, to: i });
                }
            }
            else{       // == joint
                for( let i=0; i<sg.length; i+=1 ){
                    nodes.add({ id: i, label: sg[i] }); //, color: { background: 'lightcyan'} });
                    if(i < sg.length-1) edges.add({ from: i, to: sg.length-1 });
                }
            }
            // create a network
            let container = this.subVisContainers.nativeElement.children[sg_idx];
            let options = {
                edges: {
                    arrows: { to: {enabled: true, type: 'arrow', scaleFactor: 0.5} },
                },
                // layout: {
                //     hierarchical: { direction: "UD", },
                // },
            };
            this.subGraphs[sg_idx] = new vis.Network(container, {nodes: nodes, edges: edges}, options);
            // this.subGraphs[sg_idx].redraw();

            // next
            sg_idx += 1;
            if( sg_idx > this.sizeOfSubGraphs ) break;
        }
    }
*/

    vis_graph(x: any){
        if(!x) return;

        let pivot = `${this.positives.join("+")}`;
        if( this.negatives.length > 0 ) pivot += `\n-(${this.negatives.join(",")})`;

        // id: number or string
        let nodes_data = new vis.DataSet([{ id: 0, label: pivot, group: 0, shape: "box" }], {});
        let edges_data = new vis.DataSet([], {});
        // console.log(nodes_data.get(0));

        this.segments = new Map(Object.entries(x['segments']));
        let order = 1;

        // neighbors
        for(let nbr of x['neighbors']){
            nodes_data.add({ id: order, label: nbr[0], group: 1 });     // , borderWidth: 10*nbr[1]
            let sg_size = this.segments.get(nbr[0]).length;
            edges_data.add({
                from: 0, to: order, arrows: {to: {enabled: true}},
                width: 1+2*Math.log10(sg_size),
                label: `${nbr[1].toFixed(4)}`, font: { align: "middle" }
            });
            order += 1;
        }


        // nbr_edges : 정보성 낮고, 너무 어지럽다 (1132개)
        // let limit = 50;
        // for(let nbrs of x['nbr_edges']){
        //     edges_data.add({ from: idMap.get(nbrs[0]), to: idMap.get(nbrs[1]), weight: nbrs[2] });
        //     if((--limit) == 0) break;
        // }

        // create a network
        let container = this.mainVisContainer.nativeElement;    // document.getElementById('vis-network');
        // provide the data in the vis format
        let data = {
            nodes: nodes_data,
            edges: edges_data
        };
        // styles
        let options = {
            nodes: {
                font: {
                    size: 11,
                    face: 'arial',    // 'Monospace',
                },
            },
            edges: {
                // width: 1,
                // widthConstraint: { maximum: 10 },
                font: { size: 11, align: "middle" },
                arrows: {
                    to: { type: 'arrow', scaleFactor:0.5 },
                },
            },
            physics: {
                enabled: true      // true
            },
            layout: {
                randomSeed: 0,
            }
        };

        // initialize your network!
        let network = new vis.Network(container, data, options);

        // add event listeners
        network.on("select", (params)=>{
            // target: nodes
            if(params.nodes.length > 0){
                console.log("Selection Node:", params.nodes);
                if( params.nodes.length == 1 ){
                    if( nodes_data.get(params.nodes[0]).group == 1 ){
                        let sg_pivots: string[] = [...x['positives']];
                        sg_pivots.push(nodes_data.get(params.nodes[0]).label);
                        let sg_list = this.segments.get( nodes_data.get(params.nodes[0]).label );
                        console.log(`${sg_pivots}: sg_list=${sg_list.length}`);
                        this.vis_subgraphs(sg_pivots, sg_list);
                    }
                }
            }
            // target: edges
            else if(params.edges.length == 1){
                console.log("Selection Edge:", params.edges[0], edges_data.get(params.edges[0]));
            }
        });

        return network;
    }

    vis_subgraphs(sg_pivots: string[], sg_list:any[]){
        // clear
        this.vis_destroy_subgraphs();

        let sg_idx = 0;
        for(let sg of sg_list){
            let nodes = new vis.DataSet();
            let edges = new vis.DataSet();
            if(sg['sg_type'][0] == 'single'){
                for( let i=0; i<sg['sg_nodes'][0].length; i+=1 ){
                    nodes.add({
                        id: i, label: sg['sg_nodes'][0][i],
                        color: { background: (sg_pivots.includes(sg['sg_nodes'][0][i]) ? '#D2E5FF' : 'orange') }
                    });
                    if(i > 0){
                        edges.add({ from: i-1, to: i });
                    }
                }
            }
            else{       // == joint
                for( let i=0; i<sg['sg_nodes'][0].length; i+=1 ){
                    nodes.add({
                        id: i, label: sg['sg_nodes'][0][i],
                        color: { background: (sg_pivots.includes(sg['sg_nodes'][0][i]) ? '#D2E5FF' : 'orange') }
                    });
                    if(i < sg['sg_nodes'][0].length-1){
                        edges.add({ from: i, to: sg['sg_nodes'][0].length-1 });
                    }
                }
            }
            // create a network
            let container = this.subVisContainers.nativeElement.children[sg_idx];
            let options = {
                edges: {
                    arrows: { to: {enabled: true, type: 'arrow', scaleFactor: 0.5} },
                },
                // layout: {
                //     hierarchical: { direction: "UD", },
                // },
            };
            this.subGraphs[sg_idx] = new vis.Network(container, {nodes: nodes, edges: edges}, options);
            // this.subGraphs[sg_idx].redraw();

            // next
            sg_idx += 1;
            if( sg_idx > this.sizeOfSubGraphs ) break;
        }
    }

}
