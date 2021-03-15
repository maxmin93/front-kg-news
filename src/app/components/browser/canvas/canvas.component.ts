import { Component, OnInit, OnDestroy, HostListener, EventEmitter, ViewChild, ElementRef, Input, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Subscription, Subject, BehaviorSubject, forkJoin } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { IElement, IGraph, EMPTY_GRAPH, ILabels, ILabel } from '../../../services/graph-models';

declare const window:any;
declare const cytoscape:any;
declare const tippy:any;

const CY_CONFIG:any ={
    layout: { name: "preset"
      , fit: false, padding: 100, randomize: false, animate: false, positions: undefined
      , zoom: undefined, pan: undefined, ready: undefined, stop: undefined
    },
    // initial viewport state:
    zoom: 1,
    minZoom: 1e-2,
    maxZoom: 1e1,
    wheelSensitivity: 0.2,
    boxSelectionEnabled: true,
    motionBlur: true,
    selectionType: "single",
    // autoungrabify: true        // cannot move node by user control
};

const UR_CONFIG:any ={
    isDebug: false,
    actions: {},
    undoableDrag: true,
    stackSizeLimit: undefined,
    ready: function () { // callback when undo-redo is ready
    }
};

@Component({
    selector: 'app-canvas',
    templateUrl: './canvas.component.html',
    styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit {

    docid: string;
    debug: boolean = false;

    cy: any = undefined;                  // cytoscape.js
    private graph$ = new BehaviorSubject<IGraph>(EMPTY_GRAPH);

    @Input() set graph(g:any) { this.graph$.next(g); }
    @Output() readyEmitter= new EventEmitter<any>();

    @ViewChild("cy", {read: ElementRef, static: false}) divCy: ElementRef;

    constructor(
        private route: ActivatedRoute,
    ) { }

    ngOnInit(): void {
        var cy = window.cy = cytoscape({
            container: document.getElementById('cy'),

            style: [
                {
                    selector: 'node',
                    style: {
                        'content': 'data(id)'
                    }
                },

                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle'
                    }
                }
            ],

            elements: {
                nodes: [
                    { data: { id: 'a' } },
                    { data: { id: 'b' } }
                ],
                edges: [
                    { data: { id: 'ab', source: 'a', target: 'b' } }
                ]
            },

            layout: {
                name: 'grid'
            }
        });

        var a = cy.getElementById('a');
        var b = cy.getElementById('b');
        var ab = cy.getElementById('ab');

        var makeTippy = function(ele, text){
            var ref = ele.popperRef();

            // Since tippy constructor requires DOM element/elements, create a placeholder
            var dummyDomEle = document.createElement('div');

            var tip = tippy( dummyDomEle, {
                getReferenceClientRect: ref.getBoundingClientRect,
                trigger: 'manual', // mandatory
                // dom element inside the tippy:
                content: function(){ // function can be better for performance
                    var div = document.createElement('div');

                    div.innerHTML = text;

                    return div;
                },
                // your own preferences:
                arrow: true,
                placement: 'bottom',
                hideOnClick: false,
                sticky: "reference",

                // if interactive:
                interactive: true,
                appendTo: document.body // or append dummyDomEle to document.body
            } );

            return tip;
        };

        var tippyA = makeTippy(a, 'foo');

        tippyA.show();

        var tippyB = makeTippy(b, 'bar');

        tippyB.show();

        var tippyAB = makeTippy(ab, 'baz');

        tippyAB.show();
    }

    ngOnDestroy(): void{

    }

    goSource(){

    }

    //////////////////////////////////////////////

}
