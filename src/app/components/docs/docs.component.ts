import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';

import { Document, NewsResponse } from '../../services/news-models';
import { NewsApiService } from '../../services/news-api.service';
import { UiApiService } from '../../services/ui-api.service';

const DEFAULT_PAGE_SIZE: number = 10;
const DEFAULT_PAGE_INDEX: number = 0;

@Component({
  selector: 'app-docs',
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.scss']
})
export class DocsComponent implements OnInit {

    docs: Document[] = [];

    // for pagination
    length = 0;
    pageSize = 10;
    pageIndex = 0;
    pageSizeOptions = [5, 10, 25];
    showFirstLastButtons = true;

    formSearch = new FormGroup({
        query: new FormControl('', Validators.pattern('([^,\s]+)'))
    });

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private newsService: NewsApiService
    ) { }

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);

            // init parameters
            let value1 = localStorage.getItem('docs_index');
            if( value1 && !isNaN(Number(value1)) ) this.pageIndex = Number(value1);
            let value2 = localStorage.getItem('docs_query');
            if( value2 ){
                this.formSearch.setValue({ query: String(value2) });
            }
            console.log(`docs params: query="${this.formSearch.get('query').value}", index=${this.pageIndex}`);
            // 최신 뉴스 리스트: q=''
            this.onSearch();
        });
    }

    // 뉴스 검색
    onSearch(){
        let text: string = this.formSearch.get('query').value;
        if( text != localStorage.getItem('docs_query') ){
            this.pageIndex = 0;
        }
        localStorage.setItem('docs_index', String(this.pageIndex));
        localStorage.setItem('docs_query', text);
        // console.log(`docs params: query="${text}", index=${this.pageIndex}`);

        this.newsService.getNewsResponse(text, this.pageIndex, DEFAULT_PAGE_SIZE).subscribe( (x:NewsResponse) => {
            // console.log(x.hits, x.page_size, x.page_index, x.documents.length);
            this.docs = [...x.documents];       // refresh
            this.length = x.hits;
            this.pageSize = x.page_size;
            this.pageIndex = x.page_index;
            });
    }

    // UI -> controller
    handlePageEvent(event: PageEvent) {
        this.length = event.length;
        this.pageSize = event.pageSize;
        this.pageIndex = event.pageIndex;
        this.onSearch();
    }
}
