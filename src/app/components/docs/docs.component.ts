import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

    data: any;
    docs: Document[] = [];

    // for pagination
    length = 0;
    pageSize = 10;
    pageIndex = 0;
    pageSizeOptions = [5, 10, 25];
    showFirstLastButtons = true;

    @ViewChild('search_input', {static: false}) private searchInput: ElementRef;

    constructor(
        private route: ActivatedRoute,
        private uiService: UiApiService,
        private newsService: NewsApiService
    ) { }

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);
        });
        // 최신 뉴스 리스트: q=''
        this.onSearch(DEFAULT_PAGE_SIZE, DEFAULT_PAGE_INDEX);
    }

    // 뉴스 검색
    onSearch(page_size=DEFAULT_PAGE_SIZE, page_index=DEFAULT_PAGE_INDEX){
        let text:string = this.searchInput != undefined ? this.searchInput.nativeElement.value : '';
        this.newsService.getNewsResponse(text.trim(), page_size, page_index).subscribe( (x:NewsResponse) => {
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
        this.onSearch(this.pageSize, this.pageIndex)
    }
}
