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

    positives: string[] = ['이명박','박근혜'];
    negatives: string[] = ['북한'];
    topN: number = 50;
    threshold: number = 0.65;

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
        this.vis_graph_exam();
    }

    ngOnDestroy(): void{
        if(this.handler_pivots) this.handler_pivots.unsubscribe();
        // if(this.handler_synonyms) this.handler_synonyms.unsubscribe();
        if(this.handler_graph) this.handler_graph.unsubscribe();
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
            this.vis_graph(x);

            // this.positives = x['positives'];
            // this.negatives = x['negatives'];
            // this.graph = this.makeGraph(x);
        });
    }

    // 사용 안함
    // return: [ [noun, score], .. ]
    // getN2vSynonyms(pivot: string): Subscription{
    //     return this.wordsService.getN2vSynonyms(pivot).subscribe(x=>{
    //         console.log('synonyms:', x);
    //         this.synonyms = x;
    //     });
    // }
/*

    // return: { pivot, nodes[], edges_syn[], edges_fof[] }
    getN2vGraphExtend(pivot: string): Subscription{
        return this.wordsService.getN2vGraph(pivot).subscribe(x=>{
            let new_nodes: Set<string> = new Set(x['nodes']);
            let diff_nodes = new Set([...new_nodes].filter(n => !this.words.has(n)));
            let diff_edges = x['edges_syn'].filter(e => diff_nodes.has(e[1]));
            let diff_graph = {
                pivot: pivot,
                nodes: [...diff_nodes],
                edges_syn: diff_edges
            }

            let ext_graph: IGraph = this.makeGraph(diff_graph);
            console.log('graph.extend:', ext_graph);
            // let pivots = new Set([pivot]);
            this.words = new Set([...this.words, ...diff_nodes]);     // union
            console.log('words.extend:', diff_nodes);
        });
    }
*/
    makeGraph(data: any, nodes: Map<string,IElement> = undefined): IGraph{
        let idx = -1;
        if( !nodes ){
            nodes = new Map();
            nodes.set( data.pivot, this.createElement('nodes', ++idx, data.pivot) );
        }
        else{

        }

        for(let e of data.nodes){
            nodes.set( e, this.createElement('nodes', ++idx, e) );
        }
        // console.log('nodes =', nodes.values());

        let edges: IElement[] = [];
        let rnk = -1;
        for(let e of data.edges_syn){
            edges.push(
                this.createElement('edges', ++rnk, e[0]+'_'+e[1], {score: e[2], rank: rnk, relation: 'syn'},
                    nodes.get(e[0]), nodes.get(e[1]))
            );
        }
        // ** FOF 의 edge 가 중복되어 일단 주석처리
        //    그리고, 당장은 의미 없는 관계
        // for(let e of data.edges_fof){
        //     edges.push(
        //         this.createElement('edges', ++rnk, e[0]+'_'+e[1], {score: e[2], rank: rnk, relation: 'fof'},
        //             nodes.get(e[0]), nodes.get(e[1]))
        //     );
        // }
        // console.log('edges =', edges);

        return <IGraph>{
            datasource: data.pivot,
            nodes: [...nodes.values()],     // convert iterable to array
            edges: edges
        };
    }

    createElement(group: string, index: number, name: string, properties: any = {}
        , source: IElement = undefined, target: IElement = undefined
    ): IElement{
        return <IElement> {
            group: group,
            data: {
                id: (group == 'nodes' ? 'n' : 'e')+index,
                name: name,
                properties: properties,
                source: group == 'nodes' ? undefined : source.data.id,
                target: group == 'nodes' ? undefined : target.data.id
            },
            scratch: {
                _index: index,
                _color: group == 'nodes' ?
                        [this.colorService.next(), undefined] :
                        [source.scratch._color[0], target.scratch._color[0]],
                _source: group == 'nodes' ? undefined : source,
                _target: group == 'nodes' ? undefined : target
            }
        };
    }

    //////////////////////////////////////////////

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

    vis_graph(x: any){
        if(!x) return;

        let pivot = `${this.positives.join("+")}`;
        if( this.negatives.length > 0 ) pivot += `\n-(${this.negatives.join(",")})`;

        // id: number or string
        let nodes_data = new vis.DataSet([{ id: 0, label: pivot, group: 0 }], {});
        let edges_data = new vis.DataSet([], {});
        // console.log(nodes_data.get(0));

        let idMap: Map<string,number> = new Map();
        let order = 1;

        // neighbors
        for(let nbr of x['neighbors']){
            idMap.set(nbr[0], order);
            nodes_data.add({ id: order, label: nbr[0], group: 1 });
            edges_data.add({ from: 0, to: order, weight: nbr[1] });
            order += 1;
        }

        // nbr_edges : 너무 어지럽다 (1132개)
        // let limit = 50;
        // for(let nbrs of x['nbr_edges']){
        //     edges_data.add({ from: idMap.get(nbrs[0]), to: idMap.get(nbrs[1]), weight: nbrs[2] });
        //     if((--limit) == 0) break;
        // }

        // create a network
        let container = document.getElementById('vis-network');
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
                    to:     {enabled: false, scaleFactor:1},
                    middle: {enabled: false, scaleFactor:1},
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
            // physics: { enabled: false },
            // layout: {
            //     hierarchical: {
            //       direction: "UD",
            //     },
            // },
        });
    }

    vis_graph_exam(){
        // create an array with nodes
        let nodes = new vis.DataSet([
            {id: "a1", label: 'Node 1'},
            {id: 2, label: 'Node 2'},
            {id: 3, label: 'Node 3'},
            {id: 4, label: 'Node 4'},
            {id: 0, label: 'Node 5'}
        ]);

        // create an array with edges
        let edges = new vis.DataSet([
            {from: "a1", to: 3},
            {from: "a1", to: 2},
            {from: 2, to: 4},
            {from: 2, to: 0}
        ]);

        // create a network
        let container = document.getElementById('vis-subg00');

        // provide the data in the vis format
        let data = {
            nodes: nodes,
            edges: edges
        };
        let options = {};

        // initialize your network!
        let network = new vis.Network(container, data, options);
    }

}
