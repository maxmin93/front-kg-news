import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MediaChange, MediaObserver } from '@angular/flex-layout';

import { Observable, PartialObserver, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { UiApiService } from '../../services/ui-api.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {

    watcher: Subscription;
    mediaQueries:Map<string, MediaChange> = new Map();
    activeMediaQuery:string;

    constructor(
        mediaObserver: MediaObserver,
        private route: ActivatedRoute,
        private uiService: UiApiService,
    ){
        // https://github.com/angular/flex-layout/wiki/MediaObserver
        // mediaObserver.asObservable().subscribe(changes=>{
            // console.log('MediaChange:', changes);
            // ==> mq 5개가 나옴: lg, lt-xl, gt-md, gt-sm, gt-xs
        // });

        this.watcher = mediaObserver.media$.subscribe((change: MediaChange) => {
            console.log('MediaChange:', change);
            this.activeMediaQuery = change ? `'${change.mqAlias}' = (${change.mediaQuery})` : '';
            console.log('activeMediaQuery:', this.activeMediaQuery);
            if ( change.mqAlias == 'xs') {
                // this.loadMobileContent();
            }
        });
    }

    ngOnDestroy(): void {
        this.watcher.unsubscribe();
    }

    ngOnInit(): void {
        // data of routes
        this.route.data.subscribe(data => {
            this.uiService.pushRouterData(data);
        });
    }

}
