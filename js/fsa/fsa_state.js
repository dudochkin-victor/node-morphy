/**
 * This file is part of Morphy library
 * 
 * Copyright c 2007-2008 Kamaev Vladimir <heromantor@users.sourceforge.net>
 * 
 * This library is free software; you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option) any
 * later version.
 * 
 * This library is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 */

function Morphy_Link_Base() {
	var fsa, trans, raw_trans;

	function Morphy_Link_Base(/* Fsa_Interface */fsa, trans, rawTrans) {
		this.fsa = fsa;
		this.trans = trans;
		this.raw_trans = rawTrans;
	}

	function isAnnotation() {
	}
	function getTrans() {
		return this.trans;
	}
	function getFsa() {
		return this.fsa;
	}
	function getRawTrans() {
		return this.raw_trans;
	}
};

/**
 * This function represent "normal" link i.e. link that points to automat state
 */
function Morphy_Link()/* extends Morphy_Link_Base */{
	function isAnnotation() {
		return false;
	}

	function getDest() {
		return this.trans['dest'];
	}
	function getAttr() {
		return this.trans['attr'];
	}

	function getTargetState() {
		return this.createState(this.trans['dest']);
	}

	function createState(index) {
		return new Morphy_State(this.fsa, index);
	}
}

function Morphy_Link_Annot()/* extends Morphy_Link_Base */{
	function isAnnotation() {
		return true;
	}

	function getAnnotation() {
		return this.fsa.getAnnot(this.raw_trans);
	}
};

function Morphy_State() {
	var fsa, transes, raw_transes;

	function Morphy_State(/* Fsa_Interface */fsa, index) {
		this.fsa = fsa;

		this.raw_transes = fsa.readState(index);
		this.transes = fsa.unpackTranses(this.raw_transes);
	}

	function getLinks() {
		var result = [];

		for (i = 0, c = this.transes.length; i < c; i++) {
			trans = this.transes[i];

			if (!trans['term']) {
				result.push(this
						.createNormalLink(trans, this.raw_transes[i]));
			} else {
				result.push(this.createAnnotLink(trans, this.raw_transes[i]));
			}
		}

		return result;
	}

	function getSize() {
		return this.transes.length;
	}

	function createNormalLink(trans, raw) {
		return new Morphy_Link(this.fsa, trans, raw);
	}

	function createAnnotLink(trans, raw) {
		return new Morphy_Link_Annot(this.fsa, trans, raw);
	}
};
