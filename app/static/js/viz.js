var app = angular.module('ngJigsawApp',['sf.virtualScroll','pasvaz.bindonce', 'ngSanitize']);

app.config(function($logProvider){
  $logProvider.debugEnabled(false);
});
