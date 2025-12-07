import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConciliacionComponent } from './conciliacion.component';

describe('ConciliacionComponent', () => {
  let component: ConciliacionComponent;
  let fixture: ComponentFixture<ConciliacionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConciliacionComponent]
    });
    fixture = TestBed.createComponent(ConciliacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
