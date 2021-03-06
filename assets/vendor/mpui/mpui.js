/**
 * angular 工具库js文件
 * @authors helin
 * @date    2017-10-30
 * @version 0.1.0
 */

(function (factory) {
    // AMD
    if (typeof define === 'function' && define.amd) {
        define(['angular'], factory);
    } else {
        if (typeof angular === 'undefined') {
            throw new Error('mpui depends on angular');
        }

        factory(angular);
    }
})
(function (angular) {

if (!angular.element.fn || !angular.element.fn.on) {
	throw new Error('mpui depends on jQuery instead of jqLite');
}

// 是否为整数
function isInteger(it, isNullable, isNegative) {
    return (isNullable && it === null || Math.floor(it) === it) && (isNegative || it >= 0);
}

// 是否为字符串整数
function isStringInteger(it, isNullable, isNegative) {
    if (it === undefined) {
        return false;
    }
    return isNullable && (it === null || it === '') || String(it).indexOf('.') === -1 && Math.floor(it) === Number(it) && (isNegative || +it >= 0);
}

// html 字符串编码
function htmlEncode(str) {
    if (typeof str !== 'string') {
        return str;
    }

    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;');
}

var requestAnimationFrame = window.requestAnimationFrame 
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || function (fn) {
    setTimeout(fn, 20);
};

// 检测是否支持passive events
var passiveEvents = false;
try {
    var opts = Object.defineProperty({}, 'passive', {
        get: function() {
            passiveEvents = { passive: true };
        }
    });
    window.addEventListener('test', null, opts);
} catch (e) {}

// 监听元素尺寸变化
function onElementResize(ele, handler) {
    if (!(ele instanceof HTMLElement)) {
        throw new TypeError('ele is not instance of HTMLElement.');
    }
    // https://www.w3.org/TR/html/syntax.html#writing-html-documents-elements
    if (/^(area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr|script|style|textarea|title)$/i.test(ele.tagName)) {
        throw new TypeError('Unsupported tag type. Change the tag or wrap it in a supported tag(e.g. div).');
    }

    function initEvent() {
        // 如果元素被隐藏，则定时检测，直到元素显示出来再初始化监听尺寸变化
        if (ele.offsetWidth === 0 && ele.offsetHeight === 0) {
            setTimeout(initEvent, 200);
            return;
        }

        var lastWidth = ele.offsetWidth || 1;
        var lastHeight = ele.offsetHeight || 1;
        var maxWidth = 10000 * lastWidth;
        var maxHeight = 10000 * lastHeight;

        var expand = document.createElement('div');
        expand.style.cssText = '\
            position: absolute;\
            top: 0;\
            bottom: 0;\
            left: 0;\
            right: 0;\
            z-index: -10000;\
            overflow: hidden;\
            visibility: hidden;';
        var shrink = expand.cloneNode(false);

        var expandChild = document.createElement('div');
        expandChild.style.cssText = 'transition: 0s; animation:none;';
        var shrinkChild = expandChild.cloneNode(false);

        expandChild.style.width = maxWidth + 'px';
        expandChild.style.height = maxHeight + 'px';
        shrinkChild.style.width = '250%';
        shrinkChild.style.height = '250%';

        expand.appendChild(expandChild);
        shrink.appendChild(shrinkChild);
        ele.appendChild(expand);
        ele.appendChild(shrink);

        if (expand.offsetParent !== ele) {
            ele.style.position = 'relative';
        }

        expand.scrollLeft = shrink.scrollLeft = maxWidth;
        expand.scrollTop = shrink.scrollTop = maxHeight;    

        var newWidth = 0;
        var newHeight = 0;
    
        function onScroll() {
            requestAnimationFrame(checkResize);
        }

        function checkResize() {            
            newWidth = ele.offsetWidth || 1;
            newHeight = ele.offsetHeight || 1;
            if (newWidth !== lastWidth || newHeight !== lastHeight) {
                lastWidth = newWidth;
                lastHeight = newHeight;
                onResize();
            }
            expand.scrollTop = shrink.scrollTop = maxHeight;
            expand.scrollLeft = shrink.scrollLeft = maxWidth;
        }
    
        function onResize() {
            handler && handler();
        }

        expand.addEventListener('scroll', onScroll, passiveEvents);
        shrink.addEventListener('scroll', onScroll, passiveEvents);
        // 第一次事件主动触发
        onResize();
    }

    // IE9 hack
    function hack() {
        var lastWidth = ele.offsetWidth || 1;
        var lastHeight = ele.offsetHeight || 1;
        
        function checkResize() {
            var newWidth = ele.offsetWidth || 1;
            var newHeight = ele.offsetHeight || 1;
            if (newWidth !== lastWidth || newHeight !== lastHeight) {
                lastWidth = newWidth;
                lastHeight = newHeight;
                onResize();
            }
            setTimeout(checkResize, 200);
        }

        function onResize() {
            handler && handler();
        }

        checkResize();
    }

    if (window.FormData) {
        initEvent();
    } else {
        hack();
    }
}

angular.module('mpui', ['mpui.tpls'])

/**
 * 表格指令
 */
.directive('mpuiTb', ['$timeout', '$document', function ($timeout, $document) {
	return {
		restrict: 'EA',
		replace: true,
		prority: 1001,
		scope: {
			maxHeight: '=?', // 表格最大高度
			resize: '@?', // 是否可拖动列宽
			defaultOrderBy: '@?', // 默认排序字段
			defaultOrderSort: '@?', // 默认排序方式
			cancelOrder: '@?', // 是否可以取消排序
			onSort: '&?' // 排序回调
		},
		templateUrl: 'mpui-tb.html',
		transclude: true,
		controller: function ($scope) {
			this.orderBy = $scope.defaultOrderBy;
			this.orderSort = $scope.defaultOrderSort;
			this.cancelOrder = $scope.cancelOrder === 'true' ? true : false;

			// 排序
			this.sort = function (orderBy, orderSort) {
				this.orderBy = orderBy;
				this.orderSort = orderSort;
				// 排序回调
				$scope.onSort({ orderBy: orderBy, orderSort: orderSort });
				// 通知排序子指令排序发生变化
				$scope.$broadcast('onSort', { orderBy: orderBy, orderSort: orderSort });
			};
		},
		link: function ($scope, $ele, $attrs, ctrls) {
			var $header = $ele.find('.mpui-tb-header');
			var $body = $ele.find('.mpui-tb-body');

			// 删除属性以移除overflow:hidden
			$ele[0].removeAttribute('mpui-tb');			
			// 去掉表头的tbody
			$header.find('.mpui-tb-header-inner > table > tbody').remove();
			// 设置表格最大高度
			$scope.$watch('maxHeight', function (value) {
				$body.css('max-height', value ? value : 'none');
			});

			// 左右拖动
			$body.on('scroll', function (evt) {
				$header.find('.mpui-tb-header-inner').css('left', -this.scrollLeft);
			});

			// 阻止表头文字拖动时造成表格滚动条滚动的事件
			$ele.on('drag', '.mpui-tb-header', function (evt) {
				evt.stopPropagation();
			});

			if ($attrs.resize === 'true') {
				addResize();
			}

			// 表头拖动
			function addResize () {
				// 鼠标滑过表头添加可拖动标识
				$ele.on('mouseenter', '.mpui-tb-header-inner > table > thead > tr > th', function (evt) {
					if (!$(this).find('.mpui-th-resize-line').length) {
						$(this).addClass('mpui-th-resize');
						$(this).append('<div class="mpui-th-resize-line"></div>');
					}					
				});

				// 鼠标移开表头删除可拖动标识
				$ele.on('mouseleave', '.mpui-tb-header-inner > table > thead > tr > th', function (evt) {
					$(this).removeClass('mpui-th-resize');
					$(this).find('.mpui-th-resize-line').remove();
				});

				// 拖动
				$ele.on('mousedown', '.mpui-th-resize-line', function (evt) {
					evt.stopPropagation();
					evt.preventDefault();

					var $th = $(this).closest('th');
					var index = $th.index();
		        	var oldClientX = evt.clientX;
		        	var oldWidth = $th.outerWidth();
		        	var headerCols = $ele.find('.mpui-tb-header-inner > table > colgroup > col');
		        	var headerThs = $ele.find('.mpui-tb-header-inner > table > thead > tr > th');
		        	var bodyCols = $ele.find('.mpui-tb-body-inner > table > colgroup > col');
		        	var bodyThs = $ele.find('.mpui-tb-body-inner > table > thead > tr > th');
		        	var resizeMask = $('<i class="mpui-resize-mask"></i>').appendTo('body');
		        	isResizing = true;

			        resizeMask.on('mousemove.mpui-th-resize', function (evt) {
			        	var newWidth = Math.max(evt.clientX - oldClientX + oldWidth, 20);
			        	if (headerCols.length) {
			        		headerCols.eq(index).width(newWidth);
			        		bodyCols.eq(index).width(newWidth);
			        	} else {
			        		headerThs.eq(index).width(newWidth);
			        		bodyThs.eq(index).width(newWidth);
			        	}
			        	evt.preventDefault();
			        	evt.stopPropagation();
			        });
			        
			        resizeMask.on('mouseup.mpui-th-resize', function (evt) {
						resizeMask.remove();
			        	$th.find('.mpui-th-resize-line').remove();
			        	evt.preventDefault();
			        	evt.stopPropagation();
			        });
		        });
			}

			onElementResize($body.find('.mpui-tb-body-inner')[0], function () {
				$header.width($body[0].clientWidth);
			});
		}
	};
}])

/**
 * 表格排序指令
 */
.directive('mpuiTbOrder', [function () {
	return {
		restrict: 'EA',
		require: '^mpuiTb',
		link: function ($scope, $ele, $attrs, ctrls) {
			var tbController = ctrls;
			var orderBy = $attrs.mpuiTbOrder;

			if (!orderBy || $attrs.orderDisabled === 'true') return;

			$ele.addClass('mpui-tb-order');

			// 排序操作
			$ele.on('click', function (evt) {
				var orderSort = '';

				if (tbController.orderBy !== orderBy) {
					orderSort = 'asc';
				} else {
					if (tbController.cancelOrder) {
						orderSort = tbController.orderSort === '' ? 'asc' : tbController.orderSort === 'asc' ? 'desc' : '';
					} else {
						orderSort = tbController.orderSort === 'asc' ? 'desc' : 'asc';
					}					
				}
				tbController.sort(orderSort ? orderBy : '', orderSort);
				evt.preventDefault();
				evt.stopPropagation();
			});

			// 阻止快速点击选中文字
			$ele.on('selectstart', function (evt) {
				evt.stopPropagation();
				evt.preventDefault();
			});

			// 排序变化
			$scope.$on('onSort', function (evt, data) {
				setClass();
			});

			// 初始化设置
			setClass();

			function setClass() {
				$ele.removeClass('asc desc');
				if (tbController.orderBy === orderBy) {
					$ele.addClass(tbController.orderSort);
				}
			}
		}
	};
}])

/**
 * 分页指令
 */
.directive('mpuiPager', ['$timeout', function ($timeout) {
	return {
		restrict: 'EA',
		replace: true,
		templateUrl: 'mpui-pager.html',
		scope: {
			total: '=',
			pageIndex: '=?',
			pageSize: '=?',
			pageLength: '=?',
			onPaging: '&'
		},
		link: function ($scope, $ele, $attrs) {
			$scope.pageIndex = $scope.pageIndex || 1;
			$scope.startIndex = $scope.pageIndex;
			$scope.endIndex = 0;
			$scope.pageSize = $scope.pageSize || 20;
			$scope.pageSizeArray = [$scope.pageSize, $scope.pageSize * 2, $scope.pageSize * 4, $scope.pageSize * 8];
			$scope.pageInfo = $attrs.pageInfo === 'false' ? false : true;
			$scope.pageLength = $scope.pageLength || 5;

			$scope.goPage = function (pageIndex, evt) {
				if (evt) {
					evt.stopPropagation();
					evt.preventDefault();
				}
				$scope.pageIndex = pageIndex;
				$timeout(function () {
					$scope.onPaging({ pageIndex: $scope.pageIndex, pageSize: $scope.pageSize });
				});
			};

			$scope.skipPage = function (evt) {
				if (evt.keyCode === 13) {
					var pageIndex = +evt.target.value;

					if (!isInteger(pageIndex)) {
	                    alert('请输入整数页码');
	                    return;
	                }
	                if (pageIndex > $scope.totalPage || pageIndex <= 0) {
	                    alert('页码不在范围内');
	                    return;
	                }
	                evt.target.value = '';
	                $scope.goPage(pageIndex);
	                evt.stopPropagation();
	                evt.preventDefault();
				}
			};

			$scope.changePageSize = function (size) {
				$scope.pageSize = size;
				$scope.goPage(1);
				calcPage();
			};

			$scope.$watch('total', function () {
				calcPage();
			});
			$scope.$watch('pageIndex', function () {
				calcPage();
			});

			// 计算页码信息
			function calcPage() {
				$scope.totalPage = Math.ceil($scope.total / $scope.pageSize);
		        if ($scope.pageIndex <= $scope.startIndex || $scope.pageIndex === $scope.totalPage) {
		            $scope.startIndex = Math.max(1, $scope.pageIndex - $scope.pageLength + 1);
		        } else if ($scope.pageIndex >= $scope.endIndex) {
		            $scope.startIndex = Math.min($scope.pageIndex, $scope.totalPage - $scope.pageLength + 1);
		        }
		        $scope.endIndex = Math.min($scope.startIndex + $scope.pageLength - 1, $scope.totalPage);
		        $scope.pageList = [];
		        for (var i = $scope.startIndex; i <= $scope.endIndex; i++) {
		        	$scope.pageList.push(i);
		        }
			};
		}
	};
}])

/**
 * 下拉菜单指令，收起/展开切换
 */
.directive('mpuiDropdown', ['$document', function ($document) {
    return {
        restrict: 'EA',
        link: function ($scope, $ele, $attrs) {
            $ele.on('click', '> .btn', function (evt) {
                evt.stopPropagation();
                evt.preventDefault();
                $ele.toggleClass('open');
            });

            $ele.on('click', '> .dropdown-menu', function (evt) {
                evt.stopPropagation();
            });

            $document.find('body').on('click', function (evt) {
                $ele.removeClass('open');
            });
        }
    };
}])

/**
 * 是否显示元素，依赖bootstrap的hidden类
 */
.directive('mpuiShow', [function () {
    return {
        link: function ($scope, $ele, $attrs) {
            $scope.$watch($attrs.mpuiShow, function (value) {
                if (value) {
                    $ele.removeClass('hidden');
                } else {
                    $ele.addClass('hidden');
                }
            });
        }
    }
}])

/**
 * 不换行显示字符串，超出截断
 */
.directive('textEllipsis', ['$sce', function ($sce) {
	return {
		restrict: 'A',
        replace: true,
        scope: {
            textEllipsis: '='
        },
        template: '<div class="text-ellipsis" title="{{textEllipsis}}">{{textEllipsis}}</div>'
	}
}])

/**
 * 工具服务
 */
.service('mpuiUtilService', ['$window', '$document', function ($window, $document) {
	var SCROLLBAR_WIDTH;
	var BODY_SCROLLBAR_WIDTH;

	return {
		// 浏览器滚动条宽度
        getScrollbarWidth: function (isBody) {
        	if (isBody) {
        		if (typeof SCROLLBAR_WIDTH === 'undefined') {
        			var $body = $document.find('body');
		            $body.addClass('mpui-body-scrollbar-measure');
		            BODY_SCROLLBAR_WIDTH = $window.innerWidth - $body[0].clientWidth;
		            BODY_SCROLLBAR_WIDTH = isFinite(BODY_SCROLLBAR_WIDTH) ? BODY_SCROLLBAR_WIDTH : 0;
		            bodyElem.removeClass('mpui-body-scrollbar-measure');
        		}
        		return BODY_SCROLLBAR_WIDTH;
        	} else {
		        if (typeof SCROLLBAR_WIDTH === 'undefined') {
		          var $ele = $('<div class="mpui-scrollbar-measure"></div>');
		          $document.find('body').append($ele);
		          SCROLLBAR_WIDTH = $ele[0].offsetWidth - $ele[0].clientWidth;
		          SCROLLBAR_WIDTH = isFinite(SCROLLBAR_WIDTH) ? SCROLLBAR_WIDTH : 0;
		          $ele.remove();
		        }
		        return SCROLLBAR_WIDTH;
        	}
        },
	};
}])

/**
 * 立即执行方法
 */
.run(['$document', 'mpuiUtilService', function ($document, mpuiUtilService) {
	var scrollbarWidth = mpuiUtilService.getScrollbarWidth(false);
	$document.find('head').prepend('<style type="text/css">.mpui-scrollbar-padding-right{padding-right: ' + scrollbarWidth + 'px;}.mpui-scrollbar-padding-bottom{padding-bottom: ' + scrollbarWidth + 'px;}</style>');
}]);

/**
 * 模板集合
 */
angular.module('mpui.tpls', [])
.run(['$templateCache', function ($templateCache) {
	$templateCache.put('mpui-tb.html', 
		'<div class="mpui-tb">' +
    		'<div class="mpui-tb-header">' +
				'<div class="mpui-tb-header-outer">' +
    				'<div class="mpui-tb-header-inner" ng-transclude></div>' +
    			'</div>' +
			'</div>' +
    		'<div class="mpui-tb-body">' + 
    			'<div class="mpui-tb-body-inner" ng-transclude></div>' +
    		'</div>' +
    	'</div>'
	);
	$templateCache.put('mpui-pager.html', 
		'<div class="mpui-pager" mpui-show="totalPage" ng-class="{\'justify\': pageInfo}">' +
    		'<div class="mpui-pager-control">' +
    			'<ul class="pagination">' +
    				'<li><a title="第一页" ng-click="goPage(1, $event)">«</a></li>' +
    				'<li ng-repeat="page in pageList" ng-class="{\'active\': page === pageIndex}"><a ng-click="goPage(page, $event)" ng-bind="page"></a></li>' +
    				'<li class="disabled" ng-if="endIndex < totalPage"><a>...</a></li>' +
    				'<li><a title="最后一页" ng-click="goPage(totalPage, $event)">»</a></li>' +
    			'</ul>' +
    		'</div>' +
	    	'<div class="mpui-pager-info" ng-if="pageInfo">' +
	    		'共<span class="text" ng-bind="totalPage"></span>页<span class="text" ng-bind="total"></span>条数据' +
	    		'&nbsp;&nbsp;&nbsp;&nbsp;每页显示<select class="size" ng-options="size for size in pageSizeArray" ng-model="pageSize" ng-change="changePageSize(pageSize)"></select>条数据' +
	    		'&nbsp;&nbsp;&nbsp;&nbsp;跳转到第<input type="text" class="skip" ng-keydown="skipPage($event)" />页' +
	    	'</div>' +
    	'</div>'
	);
}]);

});