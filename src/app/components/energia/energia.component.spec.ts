import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnergiaComponent } from './energia.component';

describe('EnergiaComponent', () => {
  let component: EnergiaComponent;
  let fixture: ComponentFixture<EnergiaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EnergiaComponent]
    });
    fixture = TestBed.createComponent(EnergiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
