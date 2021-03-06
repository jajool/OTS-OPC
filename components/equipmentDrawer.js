const bsn = require("bootstrap.native");
const highcharts = require("highcharts");
const opcua = require("node-opcua");
const eqManager = require('../equipment/eqManager');

class EqDrawer{
  constructor(element){
    this.element = element;
    this.modal = new bsn.Modal(element);
    this.element.addEventListener('shown.bs.modal',(e)=>{
      this.afterOpen();
    });
    this.element.addEventListener('hide.bs.modal',(e)=>{
      this.beforeColse();
    });
    this.subIds=[];
    this.vars=[];
    this.series = null;
  }
  // we should add this events to the bootstrap.native project manually.
  afterOpen(){
    for(var i=0;i<this.vars.length;i++){
      let elem = this.element.querySelector(`#detail-${this.vars[i].sName}`);
      // add listner to update input.
      this.subIds[i] = this.vars[i].subscribe(function(elem,newValue){
         elem.querySelector(`.var-value`).value=Math.round(newValue*100)/100;
      }.bind(this,elem));
      // show chart
      elem.addEventListener('click',function(variable){
        this.showChart(variable)
      }.bind(this,this.vars[i]));
      if(this.vars[i].options.editable){
        elem.querySelector(`.var-value`).addEventListener('change',(function(variable){
          return function(event){
            variable.writeValue({dataType: opcua.DataType.Double,value:this.value});
          };
        }(this.vars[i])));
      }
    }
    this.chart = highcharts.chart(this.element.querySelector('.var-chart'),{
      chart: {
          type: 'spline'
      },
      title:{'text':''},
      xAxis: {
          type: 'datetime',
          dateTimeLabelFormats: { // don't display the dummy year
            millisecond: '%S', //'%H:%M:%S.%L',
            second: '%H:%M:%S',
            minute: '%H:%M',
            hour: '%H:%M',
            day: '%H',
            week: '%H',
            month: '%H',
            year: '%H',
          },
          title: {
              text: 'Time'
          }
      },
      tooltip: {
          pointFormat: '{point.x:%e. %b}: {point.y:.2f} m'
      },

      plotOptions: {
          spline: {
              marker: {
                  enabled: false
              }
          }
      },
    });

  }
  beforeColse(){
    for(var i=0;i<this.vars.length;i++){
      this.vars[i].unsubscribe(this.subIds[i])
    }
    this.vars=[];
    this.subIds=[];
    this.series=null;
    if(this.chartVar){
      console.log('removed:'+this.chartId);
      this.chartVar.unsubscribe(this.chartId);
    }
    this.chartId=null;
    this.chartVar= null;
  }
  showChart(variable){
    if(this.chartVar && variable.nodeId==this.chartVar.nodeId)
      return;
    if(this.series){
      this.series.remove();
      this.series=null;
      console.log('removed:'+this.chartId);
      this.chartVar.unsubscribe(this.chartId);
      this.chartId=null;
      this.chartVar= variable;
    }
    this.chart.setTitle(`${variable.eq.name}=>${variable.name}`);
    this.series = this.chart.addSeries(
      {name:`${variable.name}(${variable.options.unit})`,data:variable.history.slice(0)}
    );
    this.chartVar = variable;
    this.chartId = variable.subscribe((x)=>{
      let now = new Date();
      let startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())/1000+3.5*3600;
      console.log("startofday"+startOfDay);
      this.series.addPoint([(startOfDay+eqManager.timer.lastValue)*1000,x]);
    });
    console.log('created:'+this.chartId);
  }
  draw(eq){
    let TAG = {main:`
      <div class='row'>
        <div class='col-xs-6 var-table'>
          <div class='row row-var'>
            <div class='col-xs-5'>variable</div>
            <div class='col-xs-3 text-center'>unit</div>
            <div class='col-xs-4 text-center'>value</div>
          </div>
          {$content}
        </div>
        <div class='col-xs-6 var-chart'>
        </div>
      </div
    `
    };
    let content='';
    this.vars = eq.nodesToMonitor;
    for(var i=0;i<eq.nodesToMonitor.length;i++){
      let enabled = eq.nodesToMonitor[i].options.editable?'enabled':'disabled';
      content += `<div class='row row-var' id='detail-${eq.nodesToMonitor[i].sName}'>
            <div class='col-xs-5'>${eq.nodesToMonitor[i].name}</div>
            <div class='col-xs-3 text-center'>${eq.nodesToMonitor[i].options.unit}</div>
            <div class='col-xs-4 text-center'>
              <label class="sr-only" for="var-value-${i}">Email address</label>
              <input type="text" class="form-control var-value input-sm" id="var-value-${i}" ${enabled} value="${eq.nodesToMonitor[i].lastValue}">
            </div>
          </div>
          `;
    }
    let res = TAG.main.replace(/\{\$content}/gi,content);
    this.element.querySelector('.modal-body').innerHTML = res;
    this.modal.open();
  }
}

module.exports = EqDrawer;
