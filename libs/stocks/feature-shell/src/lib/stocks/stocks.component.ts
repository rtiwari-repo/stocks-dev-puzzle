import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PriceQueryFacade } from '@coding-challenge/stocks/data-access-price-query';
import {debounceTime, distinctUntilChanged, filter, takeUntil} from 'rxjs/operators';
import {Subject} from "rxjs";

@Component({
  selector: 'coding-challenge-stocks',
  templateUrl: './stocks.component.html',
  styleUrls: ['./stocks.component.css']
})
export class StocksComponent implements OnInit, OnDestroy {
  subject: Subject<boolean> = new Subject<boolean>();
  stockPickerForm: FormGroup;
  symbol: string;
  quotes$ = this.priceQuery.priceQueries$;
  chartData: any;
  fromDate : Date = null;
  toDate : Date = null;
  showDatePicker : boolean;
  invalidDateRange: boolean;

  //Date selection beyond current date will be disabled in the Datepicker control
  maxDate = new Date();

  //Date selection prior to the given date below will be disabled in the Datepicker control
  minDate = new Date(2010, 0, 1);

  timePeriods = [
    { viewValue: 'Custom', value: 'Custom' },
    { viewValue: 'All available data', value: 'max' },
    { viewValue: 'Five years', value: '5y' },
    { viewValue: 'Two years', value: '2y' },
    { viewValue: 'One year', value: '1y' },
    { viewValue: 'Year-to-date', value: 'ytd' },
    { viewValue: 'Six months', value: '6m' },
    { viewValue: 'Three months', value: '3m' },
    { viewValue: 'One month', value: '1m' }
  ];

  constructor(private fb: FormBuilder, private priceQuery: PriceQueryFacade) {
    this.stockPickerForm = fb.group({
      symbol: [null, Validators.required],
      period: [null, Validators.required],
      fromDate: [null, Validators.required],
      toDate: [null, Validators.required]
    });
  }

  fetchQuote() {
    const { symbol, period, fromDate, toDate } = this.stockPickerForm.value;
    if (symbol && symbol.length > 0) {
      if(period === 'Custom') {
        this.priceQuery.fetchQuote(symbol, this.getPeriod(this.fromDate));
      } else {
        this.priceQuery.fetchQuote(symbol, period);
      }
    }
  }

  //Set the fromDate field and run the validation
  setFromDate(event) {
    this.fromDate = event.value;
    this.validateDates();
  }

  //Set the toDate field and run the validation
  setToDate(event) {
    this.toDate = event.value;
    this.validateDates();
  }

  //check if date selections are correct?
  validateDates() {
    if(this.fromDate && this.toDate) {
      //if wrong date selection is made, set both the dates as same (set with current date)
      if(this.fromDate > this.toDate) {
        this.fromDate = new Date();
        this.toDate = new Date();

        this.stockPickerForm.patchValue({
          fromDate: this.fromDate,
          toDate: this.toDate
        });
        this.invalidDateRange = true;
      } else {
        this.invalidDateRange = false;
      }
    }
  }

  //find out the range (period) between the from date and current date
  getPeriod(fromDate: Date) : string {
    let period = '';
    const diffInTime = new Date().getTime() - fromDate.getTime();
    const days = Math.round(Math.abs(diffInTime / (1000 * 60 * 60 * 24)));
    if (days > 5 * 365)
      period = 'max';
    else if (days > (2 * 365) && days <= (5 * 365))
      period = '5y';
    else if (days > 365 && days <= (2 * 365))
      period = '2y';
    else if (days > 180 && days <= 365)
      period = '1y';
    else if (days > 90 && days <= 180)
      period = '6m';
    else if (days > 30 && days <= 90)
      period = '3m';
    else if (days > 5 && days <= 30)
      period = '1m';
    else
      period = '5d';

    return period;
  }


  callDatePicker(event) {
    this.chartData = null;
    this.showDatePicker = (event.value === "Custom");
    if(this.showDatePicker)
      this.setDefaultDates();
  }

  ngOnDestroy() {
    this.subject.next(true);
    this.subject.complete();
  }

  setDefaultDates() {
    //Set default dates
    const frmDate: Date = new Date();
    frmDate.setDate(frmDate.getDate() - 30);
    this.toDate = new Date();
    this.fromDate = frmDate;

    this.stockPickerForm.patchValue({
      fromDate: this.fromDate,
      toDate: this.toDate
    });
  }

  ngOnInit() {
    this.setDefaultDates();
    this.stockPickerForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      filter(() => this.stockPickerForm.valid),
      takeUntil(this.subject))
      .subscribe(() => this.fetchQuote());

    this.quotes$.subscribe((data) =>  {
      if(this.showDatePicker) {
        this.chartData = data.filter(
          item => (new Date(item[0]) <= this.toDate) &&
            (new Date(new Date(item[0]).setDate(new Date(item[0]).getDate() + 1)) >= this.fromDate)
        );
      } else {
        this.chartData = data;
      }
    });
  }
}
