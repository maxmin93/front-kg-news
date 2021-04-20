import { Component, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout';

import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

import { ActivatedRoute } from '@angular/router';
import { UiApiService } from '../../services/ui-api.service';

declare const Chart: any;           // chart.js@^2.9.4
declare const ChartDataLabels: any; // chartjs-plugin-datalabels@^1.0.0

// enum 대신 UnionType 사용
// 참고: https://engineering.linecorp.com/ko/blog/typescript-enum-tree-shaking/
const CHART_TYPE = {
    LINE: 'line_chart',
    BAR: 'bar_chart'
} as const;
type CHART_TYPE = typeof CHART_TYPE[keyof typeof CHART_TYPE];


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
    /** Based on the screen size, switch from standard to one column per row */
    cards = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
        map(({ matches }) => {
            if (matches) {
                return [
                    { title: 'Card 1', chart_type: CHART_TYPE.BAR, cols: 1, rows: 1 },
                    { title: 'Card 2', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 },
                    { title: 'Card 3', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 },
                    { title: 'Card 4', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 }
                ];
            }

            return [
                { title: 'Card 1', chart_type: CHART_TYPE.BAR, cols: 2, rows: 1 },
                { title: 'Card 2', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 },
                { title: 'Card 3', chart_type: CHART_TYPE.LINE, cols: 1, rows: 2 },
                { title: 'Card 4', chart_type: CHART_TYPE.LINE, cols: 1, rows: 1 }
            ];
        })
    );

    @ViewChild('chartContainer', {static: false}) gridsRef: ElementRef;

    private barChart: any;
    @ViewChild('barChart', {static: false}) barChartRef: ElementRef;
    private lineChart: any;
    @ViewChild('lineChart', {static: false}) lineChartRef: ElementRef;
    private pieChart: any;
    @ViewChild('pieChart', {static: false}) pieChartRef: ElementRef;

    displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
    dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
    @ViewChild('paginator', {static: false}) paginator: MatPaginator;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private breakpointObserver: BreakpointObserver
    ) {}

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);
        });
    }

    ngAfterViewInit(): void {
        this.barChart = this.initBarChart();
        this.lineChart = this.initLineChart();
        this.pieChart = this.initPieChart();

        this.dataSource.paginator = this.paginator;

        // let width = this.gridsRef.nativeElement.offsetWidth;
        // let height = this.gridsRef.nativeElement.offsetHeight;
        // console.log(`width: ${width}, height: ${height}`);
    }

    ////////////////////////////////////////////////

    // Disregard this function, as this just randomizes the values in an array
    randomizer(): void {
        // let values = this.chartData[0].data;
        // const returnValue = [];
        // values.forEach(() => {
        //     returnValue.push(Math.round(Math.random() * 100));
        // });
        // this.chartData[0].data = returnValue;
    }

    initBarChart(): any {
        let labels = ['1월','2월','3월','4월','5월','6월','7월'];
        let data = {
          labels: labels,
          datasets: [{
            label: 'My First Dataset',
            data: [65, 59, 80, 81, 56, 55, 40],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(255, 159, 64, 0.2)',
              'rgba(255, 205, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(201, 203, 207, 0.2)'
            ],
            borderColor: [
              'rgb(255, 99, 132)',
              'rgb(255, 159, 64)',
              'rgb(255, 205, 86)',
              'rgb(75, 192, 192)',
              'rgb(54, 162, 235)',
              'rgb(153, 102, 255)',
              'rgb(201, 203, 207)'
            ],
            borderWidth: 1
          }]
        };

        let chart = new Chart(this.barChartRef.nativeElement, {
            type: 'bar',
            data: data,
            options: {
                legend: {
                    display: false
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                }
            }
        });

        return chart;
    }

    initLineChart(): any {
        let labels = ['1월','2월','3월','4월','5월','6월','7월'];
        let data = {
            labels: labels,
            datasets: [{
              label: 'My First Dataset',
              data: [
                    { data: [65, 59, 80, 81, 56, 55, 40], label: "Series A" },
                    { data: [28, 48, 40, 19, 86, 27, 90], label: "Series B" },
                    {
                        data: [180, 480, 770, 90, 1000, 270, 400],
                        label: "Series C",
                        yAxisID: "y-axis-1",
                    },
                ],
              backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(255, 159, 64, 0.2)',
                'rgba(255, 205, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(201, 203, 207, 0.2)'
              ],
              borderColor: [
                'rgb(255, 99, 132)',
                'rgb(255, 159, 64)',
                'rgb(255, 205, 86)',
                'rgb(75, 192, 192)',
                'rgb(54, 162, 235)',
                'rgb(153, 102, 255)',
                'rgb(201, 203, 207)'
              ],
              borderWidth: 1
            }]
        };

        let chart = new Chart(this.lineChartRef.nativeElement, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'First dataset',
                    data: [0, 20, 40, 50],
                    backgroundColor: 'rgba(255, 205, 86, 0.2)',
                    borderColor: 'rgba(255, 205, 86, 0.2)'
                },{
                    label: 'Second dataset',
                    data: [50, 10, 40, 20]
                }],
                labels: ['January', 'February', 'March', 'April']
            },
            options: {
                legend: {
                    display: true,
                    labels: {
                        fontColor: 'rgb(255, 99, 132)'
                    }
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            suggestedMin: 50,
                            suggestedMax: 100
                        }
                    }]
                }
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
            data: [65, 59, 80, 81, 56, 55, 40],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(255, 159, 64, 0.2)',
              'rgba(255, 205, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(201, 203, 207, 0.2)'
            ],
            borderColor: [
              'rgb(255, 99, 132)',
              'rgb(255, 159, 64)',
              'rgb(255, 205, 86)',
              'rgb(75, 192, 192)',
              'rgb(54, 162, 235)',
              'rgb(153, 102, 255)',
              'rgb(201, 203, 207)'
            ],
            borderWidth: 1
          }]
        };

        let chart = new Chart(this.pieChartRef.nativeElement, {
            type: 'pie',
            data: data,
            plugins: [ChartDataLabels],
            options: {
                legend: {
                    display: false
                },
                plugins: {
                    // https://quickchart.io/documentation/chart-js/custom-pie-doughnut-chart-labels/
                    datalabels: {
                        display: true,
                        formatter: (val, ctx) => {
                            return ctx.chart.data.labels[ctx.dataIndex];
                        },
                        align: 'top',
                        color: '#000',
                        font: {
                            size: 10,
                        }
                        // backgroundColor: '#404040'
                    },
                }
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
