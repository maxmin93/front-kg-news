import { Injectable } from '@angular/core';

import { Subject, Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UiApiService {

    // 브로커 객체
    private routerData$: Subject<any> = new Subject();

    constructor() { }

    // sender
    pushRouterData(data:any){
        this.routerData$.next( data );
    }

    // receiver
    popRouterData(){
        // 참고 https://reactgo.com/angular-component-communication/
        // asObservable helps us to prevent the
        // leaks of Observable from outside of the subject
        return this.routerData$.asObservable();
    }
}
