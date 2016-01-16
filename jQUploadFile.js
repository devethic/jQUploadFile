/**
 * 
 * jQuery jQUploadFile plugin
 *
 * - jQuery jQUploadFile plugin required HTML structure :
 *	<div id="yourUploadPanelId">
 *		<label jquploadfile="label" >Upload a file</label>
 *		<input type="hidden" jquploadfile="uploaded-files-references" />
 *      <!-- ASP.NET example :
 *      <asp:HiddenField runat="server" ClientIDMode="static" ID="MyUploadedFilesRef" />
 *      -->
 *		<div jquploadfile="files-container" ></div>
 *	</div>
 *  NOTE : label is required to simulate click on browse button required by old browsers like IE8
 *
 * - JSON response expected :
 *	{ success:true|false, "fileRef":"Uploaded file reference", errorMessage:"error message used when success equal false or not set" }
 *
 * - CSS
 *      .uploadfile-uploading-icon
 *      .uploadfile-success
 *      .uploadfile-failure
 *      .uploadfile-btn-remove
 *      .uploadedfile
 *
 * - call example :
 *	// document ready + failsafe mode
 *	jQuery(function( $ ) {
 *		$('#yourUploadPanelId').jQUploadFile({debug:true});
 *	});
 * 
 * @author : devethic
 * @license: absolutly free
 */
(function( $ ) {

    var _initialized = false;
	var _eResponseType = { JSON:"JSON" };
	var _oConf, _oLabel, _oFileContainer, _oFilesRef;

	///////////////////////////////////////
	// Plugin definition.
	//////////////////////////////////////
	
	$.fn.jQUploadFile = function( poConf ) {
	 
		// Merge default conf with passed in param conf
		_oConf = $.extend({
			
			URL: window.location.href,                                          // the url to use to submit file
			debug: false,                                                       // show iframe, alert on ajax result, enable the log
			filesRefSeparator: ';',                                             // separator used to concat files references 
			                                                                    // - NOTE1: it assumed that files references not contain this separator !!!
			                                                                    // - NOTE2: this separator will be removed from filename if it found
			filesRefResponseKey: 'fileRef',                                     // the key of the JSON response object that represents uploaded file reference
			filesNameResponseKey: 'fileName',                                   // the key of the JSON response object that represents uploaded file name
			filesRefIDSelector: '[jquploadfile="uploaded-files-references"]',   // jquery selector to use to retrieve the files references input field
			responseType: _eResponseType.JSON,	                                // the type of response returned by the server
			ajaxRequestKey: 'jQUploadFile',                                     // the key that identify the request
			uploadedFileBtnRemoveAdditionalCSSClass: '',                        // uploaded file remove button : additionals CSS classes
			uploadedFileBtnRemoveTitle: 'Remove this file',                     // uploaded file remove button : btn title (tooltip)
			uploadedFileBtnRemoveText: 'Remove this file',                      // uploaded file remove button : btn text
			afterUploadTerminated: $.noop()
			
		}, poConf );	 
		_log('jQUploadFile', 'Conf initialized');
		
		// if min HTML struct is set
		if (_initStruct(this)) {
		
			// create form, input file field, link the label to the input file field
			_addNewFile(true);
		}

		// chaining
		return this;
	};
	
	///////////////////////////////////////
	// Public functions
	//////////////////////////////////////
	
	/**
	 * remove the specified uploaded file
	 * @param {string} psFilesRefId - the id of the files references input
	 * @param {string} psUploadedFileId - the uploaded file id use as key of the data to remove
	 * @param {string} psfilesRefSeparator - the separator used to separate data into the value of the files references input
	 */
	$.fn.jQUploadFile.removeUploadedFile = function( psFilesRefId, psUploadedFileId, psfilesRefSeparator) {
		// remove data concerning an uploaded file
		$('#'+psFilesRefId).removeData(psUploadedFileId);
		
		// update list of uploaded files references
		$.fn.jQUploadFile.refreshFileRefVal( psFilesRefId, psfilesRefSeparator );
		
		// remove associated tags
		$('#'+psUploadedFileId).remove();
	};
	
	/**
	 * refresh the value of the files references input
	 * @param {string} psFilesRefId - the id of the files references input
	 * @param {string} psfilesRefSeparator - the separator used to separate data into the value of the files references input
	 */
	$.fn.jQUploadFile.refreshFileRefVal = function( psFilesRefId, psfilesRefSeparator ) {
		// remove the value
		$('#'+psFilesRefId).val(''); 
		// rebuild the value
		$.each($('#'+psFilesRefId).data(), function (psKey, poValue) { 
		    var oVal = $('#' + psFilesRefId).val();

			// concat poValue elements
			// poValue = {fileRef:"", fileName:""}
			var sValue = poValue.fileRef + psfilesRefSeparator + poValue.fileName.replace(psfilesRefSeparator, '');

			$('#'+psFilesRefId).val( oVal + (oVal != '' ? psfilesRefSeparator : '') + sValue);
		});
	}

	///////////////////////////////////////
	// Private functions
	//////////////////////////////////////
	
	/**
	 * initialize the elements required by the plugin (label and files-containers)
	 * @param {HTMLElement} poElt - the element at the origin of the call
	 * @return true if the structure is OK, false otherwise
	 */
	function _initStruct (poElt) {
		try {
			_oLabel = $('label[jquploadfile="label"]', poElt)[0];
			_oFileContainer = $('[jquploadfile="files-container"]', poElt)[0];
			_oFilesRef = $(_oConf.filesRefIDSelector, poElt)[0];
		}
		catch(oEx) {
			_log('_initStruct', 'Error get label or files-container : ' + oEx.message);
		}
		
		if (_oLabel && _oFileContainer && _oFilesRef) {
			_log('_initStruct', 'label, files-container and uploaded-files-references found');
			
			// ensures that fileref has an id
			if (!$(_oFilesRef).attr('id'))
			    $(_oFilesRef).attr('id', 'filesRef_' + (new Date().getTime()));

			return true;
		}
		return false;
	}
	
	/**
	 * create structure and event required for the upload of a new file
	 */
	function _addNewFile() {		
		
		// create IDs
		var iTs = (new Date().getTime());
		var sFormId = "form_" + iTs;
		var sFileId = "file_" + iTs;
		var sUploadedFileId = "uploaded" + sFileId;
				
		_log('_addNewFile', 'Create form and input file');
		
		// create form and input file
		$('body').append([ 
			'<form method="post" enctype="multipart/form-data" id="'+sFormId+'" action="'+_oConf.URL+'" >', // TODO remove action not really useful ?
				'<input type="file" id="' + sFileId + '" name="' + sFileId + '" uploaded-file-id="' + sUploadedFileId + '" />',
			    '<input type="hidden" name="' + (_oConf.ajaxRequestKey || 'jQUploadFile') + '" value="1" />',
			'</form>'
		].join(''));

		// move the form out of the viewport
		// NOTE: with IE8 (and others older browser ?) form and input file must not be set to display:none but moved out of the viewport
		_hideForm(sFormId);
		
		// used only when old browser detected
		// ==> add iframe and use it as target for the form
		_createTargetIframe(sFormId);

		// link the label and the input upload file tags
		$(_oLabel)
			.attr('for', sFileId)
			.css({cursor:'pointer'});		
			
		// replace onchange input upload file event
		// ==> occurs when a file has been selected by user into the upload dialog
		$('#'+sFileId).change(function (event) {
			event.preventDefault();
			_uploadFile(this);
		});

		// if value contains data, rebuild uploaded filename elements
		if (!_initialized) {
			_initialized = true;
			var aFilesRef = $(_oFilesRef).val().split(_oConf.filesRefSeparator);
			if (aFilesRef.length && aFilesRef[0]) {
				for (var i = 1; i < aFilesRef.length; i += 2)
					_showUploadedFile(aFilesRef[i - 1], aFilesRef[i]);
			}
		}
	}
	
	/**
	 * show the selected filename and upload the file
	 * @param {} poInputFile - the current input file object
	 * @param {string} psUploadedFileContainerId - the Id of the panel in which the uploaded filename and action will be displayed 
	 */
	function _uploadFile (poInputFile) {

		var sFormId = poInputFile.id.replace('file','form');
		
		// show uploaded filename
		_showUploadedFile(poInputFile);
		
		// recent browsers
		// => rewrite submit method to use FormData object and Ajax
		if (_isFormDataAPIReady()) {
			
			$('#' + sFormId).submit(function(event) {
				
				event.preventDefault();
				
				$.ajax({
					url: _oConf.URL, 
					type: 'POST',
					data: new FormData(this),
					contentType: false,
					processData: false,
					success: function(data, status){			
						//_log('form.submit', '$.ajax SUCCESS : ' + data);
						_afterUpload(sFormId, true, $.parseJSON(data));
					},
					error: function(jqXHR, status, errorthrown) {
						_log('form.submit', '$.ajax FAILURE : ' + errorthrown);
						_afterUpload(sFormId, false, errorthrown);						
					}
				});
					
				return false;
			});
		}
		// Old browsers
		// ==> Submit form to an iframe and use iframe.onload event to get submit result
		else {
			// @see _createTargetIframe()
		}
		
		// submit the form
		_submitForm(sFormId);
	}
	
	/**
	 * return the current uploaded file element
	 */
	function _getCurrentUploadedFile(psFormId) {
		_log('_getCurrentUploadedFile', 'form ID = ' + psFormId);
		return $('#'+ $('#'+psFormId+' input[type="file"]').attr('uploaded-file-id'));
	}
	
	/**
	 * do some actions after that the uploading process finished according his success or failure
	 * @param {string} psFormId - the corresponding form Id
	 * @param {boolean} pbSuccess - indicates if upload succeded or not to do the appropriate action
	 */
	function _afterUpload(psFormId, pbSuccess, poRs) {		
		
		if (pbSuccess && !poRs.success) 
			pbSuccess = false;
		
		_log('_afterUpload', 'form ID = '+psFormId+', success = '+ (pbSuccess ? "true" : "false") + (pbSuccess ? ', data = ' : ', error message : ') + poRs);
		
		// get uploaded file container
		var oUploadedFile = _getCurrentUploadedFile(psFormId);
		
		$(oUploadedFile)
			// remove uploading icon
			.removeClass("uploadfile-uploading-icon")
			// add uploadfile-success/failure CSS class
			.addClass("uploadfile-" + (pbSuccess ? "success" : "failure"))
			// add the remove button
			.append(_buildUploadedFileBtnRemove(oUploadedFile[0].id));
		
		if (pbSuccess) {			
			// add data
			if (poRs[_oConf.filesRefResponseKey]) {
				// add the file reference and filename to the data collection
				$(_oFilesRef).data(oUploadedFile[0].id, { "fileRef": poRs[_oConf.filesRefResponseKey], "fileName": poRs[_oConf.filesNameResponseKey] });
				// update the value of uploaded files references
				$.fn.jQUploadFile.refreshFileRefVal( _oFilesRef.id, _oConf.filesRefSeparator );
			}
		}
		else {
			// ??? add retry button ==> don't use _clean()
			//$(oUploadedFile).remove();
			if (poRs.errorMessage)
				$(oUploadedFile).attr('title', poRs.errorMessage.replace('"', '`').replace(/\r\n|\r|\n/, '. '));
		}
		
		// remove the form from DOM
		_clean(psFormId);

		_oConf.afterUploadTerminated.call(this, pbSuccess, poRs);
	}	
	
	/**
	 * it looks like contentWindow or contentDocument do not
	 * carry the protocol property in ie8, when running under ssl
	 * frame.document is the only valid response document, since
	 * the protocol is know but not on the other two objects. strange?
	 * "Same origin policy" http://en.wikipedia.org/wiki/Same_origin_policy
	 * @param {object HTMLIFrameElement} poIFrame - the iframe object for which we want to get document object
	 */
	function _getIframeDoc(poIFrame) {		
		
		var oDoc = null;
		
		// IE8 cascading access check
		try {
			if (poIFrame.contentWindow) {
				oDoc = poIFrame.contentWindow.document;
			}
		} 
		catch(oEx) {
			// IE8 access denied under ssl & missing protocol
			_log('_getIframeDoc', 'cannot get iframe.contentWindow document: ' + oEx.message);
		}

		if (oDoc) { 
			_log('_getIframeDoc', 'successful getting iframe content by using : iframe.contentWindow');
			return oDoc;
		}

		try { // simply checking may throw in ie8 under ssl or mismatched protocol
			oDoc = poIFrame.contentDocument ? poIFrame.contentDocument : poIFrame.document;
		} 
		catch(oEx) {
			// last attempt
			_log('_getIframeDoc', 'cannot get iframe.contentDocument: ' + oEx.message);
			oDoc = poIFrame.document;
		}
		
		if (oDoc) { 
			_log('_getIframeDoc', 'successful getting iframe content by using : iframe.contentDocument');
		}
		return oDoc;
	}
	
	// ??? TODO ??? look for server aborts
	function _checkState() {
		try {
			var state = _getIframeDoc(io).readyState;
			_log('_checkState', 'state = ' + state);
			if (state && state.toLowerCase() == 'uninitialized') {
				setTimeout(_checkState,50);
			}
		}
		catch(oEx) {
			_log('_checkState', 'Server abort: ' + oEx.message + ' ('+ oEx.name +')');
			cb(SERVER_ABORT);
			if (timeoutHandle) {
				clearTimeout(timeoutHandle);
			}
			timeoutHandle = undefined;
		}
	}
	
	/**
	 * upload the file by submitting the form the remove the from DOM and add a new one to allow a new upload
	 * @param {string} psFormId - the form Id in which to work
	 */
	function _submitForm (psFormId) {
		
		// submit form
		$('#' + psFormId).submit();

		// see _afterUpload method for the removing of the form
		
		// create a new form to allow a new uploading of a file
		_addNewFile();
	}
	
	/**
	 * remove form from DOM
	 */
	function _clean (psFormId) {
		_log('_clean', 'Form to remove, ID = ' + psFormId);
		$('#' + psFormId).remove();
	}
	
	/**
	 * show the uploaded filename (create the HTML Element) with uploading icon OR directly as downloaded poInputFileOrId is a string ID and psFilename is not empty
	 * @todo add progress bar + delete button + CSS
	 * @param {HTMLInputElement|string} poInputFileOrId - 
	 * @param {string} [psFileName] - the filename to show, required only if poInputFileOrId is a string ID
	 */
	function _showUploadedFile (poInputFileOrId, psFileName) {		
		
		var bStatic = (typeof poInputFileOrId == "string");
		var sId = (bStatic ? 'reuploadedfile_' + (new Date().getTime()) : $(poInputFileOrId).attr('uploaded-file-id'));
		var sCSS = "uploadedfile" + (bStatic ? "  uploadfile-success" : " uploadfile-uploading-icon");
		var sFileName = (psFileName ? psFileName : (bStatic ? "" : /([^\\\/]+$)/.exec(poInputFileOrId.value)[0]));

		$(_oFileContainer).append(
			'<div class="'+sCSS+'" id="'+sId+'">'+ sFileName +'</div>'
		);

		// !!! redundance with _afterUpload
		if (bStatic) {
			// add the remove button
			$('#'+sId).append(_buildUploadedFileBtnRemove(sId));
			// add the file reference and filename to the data collection
			$(_oFilesRef).data(sId, { "fileRef": poInputFileOrId, "fileName": sFileName });
		}
	}

	/**
	 *
	 * @param {string} psUploadedFileId - the ID of the uploaded filename container
	 */
	function _buildUploadedFileBtnRemove (psUploadedFileId) {
	    return '<a href="javascript:void($.fn.jQUploadFile.removeUploadedFile(\'' + _oFilesRef.id + '\', \'' + psUploadedFileId + '\', \'' + _oConf.filesRefSeparator + '\'));" class="uploadfile-btn-remove '+_oConf.uploadedFileBtnRemoveAdditionalCSSClass+'" title="'+_oConf.uploadedFileBtnRemoveTitle+'">'+_oConf.uploadedFileBtnRemoveText+'</a>';
	}

	/**
	 * Indicates if FormData object is available or not
	 */
	function _isFormDataAPIReady () {
		return (window.FormData);
	}
	
	/**
	 * TODO
	 * Indicates if "files" property is available or not on input of type file
	 * !!! Not used yet !!!
	 */
	function _isFilesAPIReady () {
		return ($("<input type='file'/>").get(0).files !== undefined);
	}

	/**
	 * move the form out of the browser viewport
	 * @param {string} psFormId - the form Id to hide
	 */
	function _hideForm (psFormId) {
		if (!_oConf.debug)
			$('#'+psFormId).css({position:"absolute", top:"-1000px", left:"-1000px"});
		else
			// debug mode ON
			_log('_hideForm', 'the form is visible because debug mode is On');
	}	
	
	/**
	 * Create an iframe and add it as the target of the specified form
	 * @param {string} psFormId - the id of the form on which to work
	 */
	function _createTargetIframe (psFormId) {
		
		if (_isFormDataAPIReady()) {
			_log('_createTargetIframe', 'do nothing because FormData object is available');
			return;
		}		
		
		var sIframeId = 'iframe_' + /_([^_]+$)/.exec(psFormId)[1];
		_log('_createTargetIframe', 'iframe ID = ' + sIframeId);
		
		// set form target
		$('#' + psFormId).attr('target', sIframeId);
		
		// create iframe, 
		// in debug the iframe is visible at the bottom of the page, not visible otherwise
		$( _oConf.debug ? 'body' : '#' + psFormId ).append('<iframe name="'+sIframeId+'" id="'+sIframeId+'"></iframe>');
		
		// define onload event to get submit result
		$('#' + sIframeId).bind('load', function () {
			var sFormId = this.id.replace('iframe', 'form');
			try {
				var oRs = $.parseJSON($(_getIframeDoc(this)).text());
				if (oRs) {
					_afterUpload(sFormId, true, oRs);
				}
			}
			catch(oEx) {
				_afterUpload(sFormId, false, oEx.message);
			}
		});
	}

	/**
	 * on debug mode only : write to console.log if possible or show message to the current HTML page
	 * @param {string} psText - the text to log
	 * @param {boolean} pbPrefixByDate - if true prefix text by current date and time like : 21/06/2015 14:16:52
	 */
	function _log ( psFunctionName, psText, pbPrefixByDate ) {

		if (!_oConf.debug)
			return;

		var d = new Date(), 
			sTmp,
			sDate = ( pbPrefixByDate 
				?
					(sTmp = '0'+(d.getDate())).substr(sTmp.length-2)+'/'+
					(sTmp = '0'+(d.getMonth()+1)).substr(sTmp.length-2)+'/'+
					d.getFullYear()+" "+
					(sTmp = ('0'+d.getHours())).substr(sTmp.length-2)+":"+
					(sTmp = ('0'+d.getMinutes())).substr(sTmp.length-2)+":"+
					(sTmp = ('0'+d.getSeconds())).substr(sTmp.length-2)
				: 
					'' );

		psText = sDate + ' \t' + psFunctionName + ' \t' + psText;

		if ( window.console && window.console.log )
			window.console.log( psText );
		else 
			$('<div style="border:5px solid #e6e6e6; background-color:#ca5651; color:white;">' + psText + '</div>').prependTo('body');
	};

})(jQuery);
