import { Component, Inject, OnInit } from '@angular/core';
import {MatDialog, MAT_DIALOG_DATA} from '@angular/material/dialog';

export interface DialogData {
    animal: 'panda' | 'unicorn' | 'lion';
};

@Component({
  selector: 'app-w2v-dialog',
  templateUrl: './w2v-dialog.component.html',
  styleUrls: ['./w2v-dialog.component.scss']
})
export class W2vDialogComponent implements OnInit {

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  ngOnInit(): void {
  }

}
