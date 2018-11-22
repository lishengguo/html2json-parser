/*
 * HTML5 Parser By Sam Blowes
 *
 * Designed for HTML5 documents
 *
 * Original code by John Resig (ejohn.org)
 * http://ejohn.org/blog/pure-javascript-html-parser/
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * ----------------------------------------------------------------------------
 * License
 * ----------------------------------------------------------------------------
 *
 * This code is triple licensed using Apache Software License 2.0,
 * Mozilla Public License or GNU Public License
 * 
 * ////////////////////////////////////////////////////////////////////////////
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License.  You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 * 
 * ////////////////////////////////////////////////////////////////////////////
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Simple HTML Parser.
 * 
 * The Initial Developer of the Original Code is Erik Arvidsson.
 * Portions created by Erik Arvidssson are Copyright (C) 2004. All Rights
 * Reserved.
 * 
 * ////////////////////////////////////////////////////////////////////////////
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * ----------------------------------------------------------------------------
 * Usage
 * ----------------------------------------------------------------------------
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 */

(function () {

	// Regular Expressions for parsing tags and attributes
	var startTag = /^<([-A-Za-z0-9_.]+)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|(?:{[^}]*})|[^>\s]+))?)*)\s*(\/?)>/,
		endTag = /^<\/([-A-Za-z0-9_.]+)[^>]*>/,
		attr = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|(?:{((?:\\.|[^}])*)})|([^>\s]+)))?/g;

	// Empty Elements - HTML 5
	var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,link,meta,param,embed,command,keygen,source,track,wbr");

	// Block Elements - HTML 5
	var block = makeMap("a,address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video");

	// Inline Elements - HTML 5
	var inline = makeMap("abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

	// Elements that you can, intentionally, leave open
	// (and which close themselves)
	var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

	// Attributes that have their values filled in disabled="disabled"
	var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

	// Special Elements (can contain anything)
	var special = makeMap("script,style");

	var HTMLParser = this.HTMLParser = function (html, handler) {
		var index, chars, match, stack = [], last = html;
		stack.last = function () {
			return this[this.length - 1];
		};

		while (html) {
			chars = true;

			// Make sure we're not in a script or style element
			if (!stack.last() || !special[stack.last()]) {

				// Comment
				if (html.indexOf("<!--") == 0) {
					index = html.indexOf("-->");

					if (index >= 0) {
						if (handler.comment)
							handler.comment(html.substring(4, index));
						html = html.substring(index + 3);
						chars = false;
					}

					// end tag
				} else if (html.indexOf("</") == 0) {
					match = html.match(endTag);

					if (match) {
						html = html.substring(match[0].length);
						match[0].replace(endTag, parseEndTag);
						chars = false;
					}

					// start tag
				} else if (html.indexOf("<") == 0) {
					match = html.match(startTag);

					if (match) {
						html = html.substring(match[0].length);
						match[0].replace(startTag, parseStartTag);
						chars = false;
					}
				}

				if (chars) {
					index = html.indexOf("<");

					var text = index < 0 ? html : html.substring(0, index);
					html = index < 0 ? "" : html.substring(index);

					if (handler.chars)
						handler.chars(text);
				}

			} else {
				html = html.replace(new RegExp("([\\s\\S]*?)<\/" + stack.last() + "[^>]*>"), function (all, text) {
					text = text.replace(/<!--([\s\S]*?)-->|<!\[CDATA\[([\s\S]*?)]]>/g, "$1$2");
					if (handler.chars)
						handler.chars(text);

					return "";
				});

				parseEndTag("", stack.last());
			}

			if (html == last)
				throw "Parse Error: " + html;
			last = html;
		}

		// Clean up any remaining tags
		parseEndTag();

		function parseStartTag(tag, tagName, rest, unary) {
			// tagName = tagName.toLowerCase();

			if (block[tagName]) {
				while (stack.last() && inline[stack.last()]) {
					parseEndTag("", stack.last());
				}
			}

			if (closeSelf[tagName] && stack.last() == tagName) {
				parseEndTag("", tagName);
			}

			unary = empty[tagName] || !!unary;

			if (!unary)
				stack.push(tagName);

			if (handler.start) {
				var attrs = [];

				rest.replace(attr, function (match, name) {
					var value = arguments[2] ? arguments[2] :
						arguments[3] ? arguments[3] :
						arguments[4] ? arguments[4] :
						fillAttrs[name] ? name : "";

					attrs.push({
						name: name,
						value: value,
						escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
					});
				});

				if (handler.start)
					handler.start(tagName, attrs, unary);
			}
		}

		function parseEndTag(tag, tagName) {
			// If no tag name is provided, clean shop
			if (!tagName)
				var pos = 0;

				// Find the closest opened tag of the same type
			else
				for (var pos = stack.length - 1; pos >= 0; pos--)
					if (stack[pos] == tagName)
						break;

			if (pos >= 0) {
				// Close all the open elements, up the stack
				for (var i = stack.length - 1; i >= pos; i--)
					if (handler.end)
						handler.end(stack[i]);

				// Remove the open elements from the stack
				stack.length = pos;
			}
		}
	};
 

	this.HTMLtoJSON = function (html) {
		var results = "";
		var level = 0;
		HTMLParser(html, {
			level: 0,
			spar: '',
			paths:[0],
			moveLevel: function (step) {
				this.level += step;
				var topchar = this.paths[this.paths.length - 1]
				if(step == 1){
					if( topchar != 'c' && topchar != 0){
						this.paths.push('c');
						results += ',\r\n' + this.spar + '"children":[' ;
					}else if(topchar != 0){
						results += ','
					}
					this.paths.push(this.level)
				} else {
					if(topchar =='c'){ 
						this.paths.pop();
						results += ']' ;
					}
					this.paths.pop()
				}
				this.spar = new Array(this.level + 1).join('\t');
			},
			start: function (tag, attrs, unary) {
				this.moveLevel(1)
				results += "{"
				attrs.unshift({
					name:'component',
					escaped:tag
				})
				for (var i = 0; i < attrs.length; i++){ 
					var name = attrs[i].name;
					var escaped = attrs[i].escaped; 
					
					results += '\r\n' + this.spar + '"' + name + '":'
					if(name.toLowerCase() == 'style'){
						results += this.parseStyle(escaped)
					} else if(escaped && escaped.indexOf('{') == 0){
						results += this.parseJson(escaped)
					} else {
						results += '"' + escaped + '"'; 
					}
					if( i < attrs.length - 1){
						results += ',';
					}
				} 
				if(unary){
					this.end(tag);
				}
			},
			end: function (tag) {
				this.moveLevel(-1)
				results += '\r\n' + this.spar + '}';
			},
			chars: function (text) {  
				/*
				text = text
					.replace(/\n/g,'\\n')
					.replace(/\r/g,'\\r')
					.replace(/\t/g,'\\t')
				*/
					
				text = text
					.replace(/\n/g,'')
					.replace(/\r/g,'')
					.replace(/\t/g,'')
					.replace(/ /g,'')

				if(text == '')return;

				this.moveLevel(1)
				results += '"' + text + '"'
				this.moveLevel(-1)
			},
			comment: function (text) {
				//results += "<!--" + text + "-->";
			},
			parseStyle: function (style){
				var obj = {}
				if(style.indexOf("{") == 0){ 
					return this.parseJson(style)
				}
				style.replace(/([\w-]+)?:([^;]+)?/g, (match, key, value) => {
					if(key.indexOf('-') != -1 ){
						key = this.toCamp(key)
					}
					obj[key] = value
				})

				return JSON.stringify(obj);
			},
			toCamp: function(key){ 
				var ks = key.split('-')
				var camp = ks[0]
				ks.forEach((item, index)=>{
					if(index == 0 || !item)return;
					camp += item[0].toUpperCase() + item.substr(1)
				}) 
				return camp
			},
			parseJson: function (json){
				if(json.indexOf('{{') == 0){
					return '"' + json + '"'
				}
				var obj = {}
				try {
					obj = new Function("return " + json.replace(/\\"/g,'"'))()
				} catch (error) {
					
				}
				return JSON.stringify(obj);
			}
		});

		return results;
	};
 

	function makeMap(str) {
		var obj = {}, items = str.split(",");
		for (var i = 0; i < items.length; i++)
			obj[items[i]] = true;
		return obj;
	}
}).apply(typeof exports == "undefined" ? window :  exports);
