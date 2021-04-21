import { Component, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';

import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

import { ActivatedRoute } from '@angular/router';
import { UiApiService } from 'src/app/services/ui-api.service';
import { NewsApiService } from 'src/app/services/news-api.service';
import { WordsApiService } from 'src/app/services/words-api.service';

declare const Chart: any;           // chart.js@^2.9.4
declare const ChartDataLabels: any; // chartjs-plugin-datalabels@^1.0.0


// enum 대신 UnionType 사용
// 참고: https://engineering.linecorp.com/ko/blog/typescript-enum-tree-shaking/
const CHART_TYPE = {
    LINE: 'line_chart',
    BAR: 'bar_chart'
} as const;
type CHART_TYPE = typeof CHART_TYPE[keyof typeof CHART_TYPE];

const CHART_COLORS = {
    green: {
      fill: '#e0eadf',
      stroke: '#5eb84d',
    },
    darkBlue: {
      fill: '#92bed2',
      stroke: '#3282bf',
    },
    purple: {
      fill: '#8fa8c8',
      stroke: '#75539e',
    },
};

const PIE_COLORS = [
    ['rgb(32, 54, 75)', 'rgba(32, 54, 75,0.2)'],      // '#20364b',
    ['rgb(44, 177, 236)', 'rgba(44, 177, 236,0.2)'],    // '#2cb1ec',
    ['rgb(49, 116, 135)', 'rgba(49, 116, 135,0.2)'],    // '#317487',
    ['rgb(95, 172, 58)', 'rgba(95, 172, 58,0.2)'],    // '#5fac3a',
    ['rgb(166, 223, 182)', 'rgba(166, 223, 182,0.2)'],    // '#a6dfb6',
    ['rgb(105, 106, 90)', 'rgba(105, 106, 90,0.2)'],    // '#696a5a',
    ['rgb(233, 219, 158)', 'rgba(233, 219, 158,0.2)'],    // '#e9db9e',
    ['rgb(255, 212, 118)', 'rgba(255, 212, 118,0.2)'],    // '#ffd476',
    ['rgb(225, 56, 99)', 'rgba(225, 56, 99,0.2)'],    // '#e13863',
    ['rgb(208, 120, 82)', 'rgba(208, 120, 82,0.2)'],    // '#d07852',
    ['rgb(47, 87, 157)', 'rgba(47, 87, 157,0.2)'],    // '#2f579d',
    ['rgb(84, 179, 235)', 'rgba(84, 179, 235,0.2)'],    // '#54b3eb',
    ['rgb(55, 98, 105)', 'rgba(55, 98, 105,0.2)'],    // '#376269',
    ['rgb(154, 195, 54)', 'rgba(154, 195, 54,0.2)'],    // '#9ac336',
];


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {


    gridLayout: any;

    @ViewChild('chartContainer', {static: false}) gridsRef: ElementRef;

    private barChart: any;
    @ViewChild('barChart', {static: false}) barChartRef: ElementRef;
    private lineChart: any;
    @ViewChild('lineChart', {static: false}) lineChartRef: ElementRef;
    private pieChart: any;
    @ViewChild('pieChart', {static: false}) pieChartRef: ElementRef;

    selectedEntity: string = 'PERSON';
    displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
    dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
    @ViewChild('paginator', {static: false}) paginator: MatPaginator;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        breakpointObserver: BreakpointObserver,
        private newsApi: NewsApiService,
        private wordsApi: WordsApiService
    ) {
        // Handset 디스플레이 감지 ==> grid-tile 사이즈 변경
        // https://material.angular.io/cdk/layout/overview#default-breakpoints
        breakpointObserver.observe([
            Breakpoints.HandsetLandscape,
            Breakpoints.HandsetPortrait
        ]).subscribe(result => {
            console.log('detect Handset:', result);
            if (result.matches) {
                // grid-tile 사이즈 변경
                this.gridLayout = {
                    cols: 1, rowHeight: 250,
                    cards: [
                        { colspan: 1, rowspan: 1 },     // cards[0]: agg_month bar
                        { colspan: 1, rowspan: 1 },     // cards[1]: df line
                        { colspan: 1, rowspan: 2 },     // cards[2]: entity table
                        { colspan: 1, rowspan: 1 },     // cards[3]: entity pie
                    ],
                    table: { pageSize: 5, hidePageSize: true }
                };
            }
            else{
                this.gridLayout = {
                    cols: 2, rowHeight: 350,
                    cards: [
                        { colspan: 2, rowspan: 1 },     // cards[0]: agg_month bar
                        { colspan: 1, rowspan: 1 },     // cards[1]: df line
                        { colspan: 1, rowspan: 2 },     // cards[2]: entity table
                        { colspan: 1, rowspan: 1 },     // cards[3]: entity pie
                    ],
                    table: { pageSize: 10, hidePageSize: false }
                };
            }
        });
    }

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);
        });

        this.reloadChart('bar');
        this.reloadChart('line');
        this.reloadChart('pie');

        // this.wordsApi.getStatDf().subscribe(data=>{
        //     console.log(data);
        // });
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;

        // canvas sizes
        let width = this.gridsRef.nativeElement.offsetWidth;
        let height = this.gridsRef.nativeElement.offsetHeight;
        console.log(`width: ${width}, height: ${height}`);

    }


    ////////////////////////////////////////////////
    //  APIs
    //

    loadBarChart(){
        this.newsApi.aggNewsMonth().subscribe(data => {
            let x_labels = Object.keys(data).map(x=>String(x));
            let y_values = Object.values(data).map(x=>Number(x));
            this.barChart = this.initBarChart(x_labels, y_values);
        })
    }

    loadLineChart(){
        this.wordsApi.getStatDf().subscribe(data => {
            const cumulativeSum = (sum => value => sum += value)(0);
            let nouns = {
                x_labels: data['nouns'].map(x=>x[0]),
                y_values: data['nouns'].map(x=>x[1])    //.map(cumulativeSum),
            };
            let entities = {
                x_labels: data['entities'].map(x=>x[0]),
                y_values: data['entities'].map(x=>x[1]).map(cumulativeSum),
            };
            this.lineChart = this.initLineChart(nouns.x_labels, [nouns.y_values, entities.y_values]);
        })
    }


    ////////////////////////////////////////////////
    //  chart.js
    //

    reloadChart(target: string){
        if( target == 'bar'){
            if(this.barChart) this.barChart.reset();
            this.loadBarChart();
        }
        else if( target == 'line'){
            if(this.lineChart) this.lineChart.reset();
            this.loadLineChart();
        }
        else if( target == 'pie'){
            if(this.pieChart) this.pieChart.reset();
            setTimeout(()=>{
                this.pieChart = this.initPieChart();
            },100);
        }
        else{

        }
    }

    initBarChart(x_labels: string[], y_values: number[]): any {
        let data = {
          labels: x_labels,
          datasets: [{
            label: 'news size',
            data: y_values,
            borderWidth: 1,
            backgroundColor: CHART_COLORS.darkBlue.fill,
            pointBackgroundColor: CHART_COLORS.darkBlue.stroke,
            borderColor: CHART_COLORS.darkBlue.stroke,
            pointHighlightStroke: CHART_COLORS.darkBlue.stroke,
            borderCapStyle: 'butt',
          }]
        };

        let chart = new Chart(this.barChartRef.nativeElement, {
            type: 'bar',
            data: data,
            options: {
                legend: { display: false },
                animation: { duration: 750, },
                scales: {
                    yAxes: [{
                        ticks: { beginAtZero: false }
                    }]
                }
            }
        });

        return chart;
    }

    initLineChart(x_labels: string[], y_values: number[][]): any {
        let data = {
            labels: x_labels,
            datasets: [{
                label: 'nouns',
                data: y_values[0],
                fill: true,
                backgroundColor: CHART_COLORS.purple.fill,
                pointBackgroundColor: CHART_COLORS.purple.stroke,
                borderColor: CHART_COLORS.purple.stroke,
                pointHighlightStroke: CHART_COLORS.purple.stroke,
                borderCapStyle: 'butt',
            },{
                label: 'entities (cumulative sum)',
                data: y_values[1],
                fill: true,
                backgroundColor: CHART_COLORS.green.fill,
                pointBackgroundColor: CHART_COLORS.green.stroke,
                borderColor: CHART_COLORS.green.stroke,
                pointHighlightStroke: CHART_COLORS.green.stroke,
            }],
        };

        let chart = new Chart(this.lineChartRef.nativeElement, {
            type: 'line',
            data: data,
            options: {
                legend: { display: true },
                animation: { duration: 750, },
                scales: {
                    yAxes: [{
                        ticks: { beginAtZero: false }
                    }]
                },
            }
        });

        return chart;
    }

    initPieChart(): any {
        let labels = ['UNKNOWN','PERSON','LOCATION','ORGANIZATION','EVENT'
                    ,'WORK_OF_ART','CONSUMER_GOOD','OTHER','PHONE_NUMBER','ADDRESS'
                    ,'DATE','NUMBER','PRICE','UNIT'];
        let data = {
          labels: labels,
          datasets: [{
            data: [65, 0, 59, 1, 80, 2, 81, 3, 56, 4, 55, 5, 40, 6],
            borderWidth: 1,
            borderColor: PIE_COLORS.map(x=>x[0]),
            backgroundColor: PIE_COLORS.map(x=>x[1]),
          }]
        };

        let chart = new Chart(this.pieChartRef.nativeElement, {
            type: 'pie',
            data: data,
            plugins: [ChartDataLabels],
            options: {
                legend: { display: false },
                animation: { duration: 750, },
                plugins: {
                    // https://quickchart.io/documentation/chart-js/custom-pie-doughnut-chart-labels/
                    datalabels: {
                        display: true,
                        formatter: (val, ctx) => {
                            return ctx.chart.data.labels[ctx.dataIndex];
                        },
                        align: 'top',
                        font: { size: 10, }
                        // color: '#000',
                        // backgroundColor: '#404040'
                    },
                }
            }
        });

        // click event on pie chart
        this.pieChartRef.nativeElement.addEventListener('click', (event)=>{
            let activePoints = chart.getElementsAtEvent(event);
            if( activePoints.length ){
                let _index = activePoints[0]['_index'];
                console.log('click:', _index, labels[_index]);
            }
        });

        return chart;
    }

}


export interface PeriodicElement {
    name: string;
    position: number;
    weight: number;
    symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
    {position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H'},
    {position: 2, name: 'Helium', weight: 4.0026, symbol: 'He'},
    {position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li'},
    {position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be'},
    {position: 5, name: 'Boron', weight: 10.811, symbol: 'B'},
    {position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C'},
    {position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N'},
    {position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O'},
    {position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F'},
    {position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne'},
    {position: 11, name: 'Sodium', weight: 22.9897, symbol: 'Na'},
    {position: 12, name: 'Magnesium', weight: 24.305, symbol: 'Mg'},
    {position: 13, name: 'Aluminum', weight: 26.9815, symbol: 'Al'},
    {position: 14, name: 'Silicon', weight: 28.0855, symbol: 'Si'},
    {position: 15, name: 'Phosphorus', weight: 30.9738, symbol: 'P'},
    {position: 16, name: 'Sulfur', weight: 32.065, symbol: 'S'},
    {position: 17, name: 'Chlorine', weight: 35.453, symbol: 'Cl'},
    {position: 18, name: 'Argon', weight: 39.948, symbol: 'Ar'},
    {position: 19, name: 'Potassium', weight: 39.0983, symbol: 'K'},
    {position: 20, name: 'Calcium', weight: 40.078, symbol: 'Ca'},
];
