import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Location } from "@angular/common";
import { NavigationEnd, Router } from "@angular/router";
import { MatSidenav } from '@angular/material/sidenav';

import { filter } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { UiApiService } from './services/ui-api.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

    tap_title: string = 'AgensKG';
    current_path: string;

    current_title: string;
    title$_handler: Subscription;

    @ViewChild('sidenav', {static: false}) private sidenav: MatSidenav;

    public constructor(
        private titleService: Title,
        private uiService: UiApiService,
        private router: Router,
        location: Location
    ) {
        router.events.pipe(
            filter(e => e instanceof NavigationEnd)
        ).subscribe(val => {
            if (location.path() != "") {
              this.current_path = location.path();
            } else {
              this.current_path = "Home";
            }
            console.log('current_path =', this.current_path);
        });
    }

    ngOnInit(): void {
        // 탭 타이틀 설정
        this.setTapTitle(this.tap_title);
        // 상단 타이틀 설정: router.data 로부터 받아옴
        this.title$_handler = this.uiService.popRouterData().subscribe((data: any)=>{
            // console.log('router_data =', data);
            // 주의! ExpressionChangedAfterItHasBeenCheckedError
            setTimeout(()=>{
                this.current_title = data['title'] + (
                    data.hasOwnProperty('docid') ? ': '+data['docid'] : ''
                );
            }, 1);
        });
    }

    ngOnDestroy(){
        this.title$_handler.unsubscribe();
    }

    public setTapTitle(newTitle: string) {
        this.titleService.setTitle(newTitle);
    }

    goToMenu(path:string) {
        this.sidenav.close();
        this.router.navigate([path]);
    }
}
