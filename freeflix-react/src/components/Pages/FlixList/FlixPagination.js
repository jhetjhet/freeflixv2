import React, { useEffect, useRef, useState } from "react";
import { Pagination } from "react-bootstrap";

const FlixPagination = ({
	currentPage = 1,
	totalPages = 1,
	npages = 7,
	onChange,
	showFirstLast = true,
	className = "flix-pagination"
}) => {
	const containerRef = useRef(null);
	const measureRef = useRef(null);

	const [visiblePages, setVisiblePages] = useState(npages);
	const [buttonWidth, setButtonWidth] = useState(44);

	const handleChange = (page) => {
		if (page < 1 || page > totalPages) return;
		if (page === currentPage) return;
		if (onChange) onChange(page);
	};

	useEffect(() => {
		if (!measureRef.current) return;
		const rect = measureRef.current.getBoundingClientRect();
		setButtonWidth(rect.width + 6);
	}, []);

	useEffect(() => {
		if (!containerRef.current) return;

		const observer = new ResizeObserver((entries) => {
			const width = entries[0].contentRect.width;
			const navButtonsCount = showFirstLast ? 4 : 2;

			const sideBuffer = 40;
			const navSpace = navButtonsCount * buttonWidth;
			const availableWidth = width - navSpace - sideBuffer;
			const maxSlots = Math.floor(availableWidth / buttonWidth);

			setVisiblePages(Math.max(1, Math.min(npages, maxSlots)));
		});

		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [buttonWidth, npages, showFirstLast]);

	const renderPages = () => {
		const items = [];

		const dynamicRange = Math.max(1, visiblePages - 2);

		let start = Math.max(1, currentPage - Math.floor(dynamicRange / 2));
		let end = Math.min(totalPages, start + dynamicRange - 1);

		if (end === totalPages) {
			start = Math.max(1, totalPages - dynamicRange + 1);
		}

		if (start > 1 && visiblePages > 2) {
			items.push(<Pagination.Item key={1} onClick={() => handleChange(1)}>1</Pagination.Item>);
			if (start > 2) items.push(<Pagination.Ellipsis key="el-s" disabled />);
		}

		for (let i = start; i <= end; i++) {
			items.push(
				<Pagination.Item key={i} active={i === currentPage} onClick={() => handleChange(i)}>
					{i}
				</Pagination.Item>
			);
		}

		if (end < totalPages && visiblePages > 2) {
			if (end < totalPages - 1) items.push(<Pagination.Ellipsis key="el-e" disabled />);
			items.push(<Pagination.Item key={totalPages} onClick={() => handleChange(totalPages)}>{totalPages}</Pagination.Item>);
		}

		return items;
	};

	return (
		<div
			ref={containerRef}
			className="w-100 d-flex justify-content-center px-2"
			style={{ overflow: "hidden" }}
		>
			<div style={{ position: "absolute", visibility: "hidden", pointerEvents: "none" }}>
				<Pagination className={className}>
					<Pagination.Item ref={measureRef}>100</Pagination.Item>
				</Pagination>
			</div>

			<Pagination className={`${className} mb-0 flex-nowrap`}>
				{showFirstLast && <Pagination.First onClick={() => handleChange(1)} disabled={currentPage === 1} />}
				<Pagination.Prev onClick={() => handleChange(currentPage - 1)} disabled={currentPage === 1} />

				{renderPages()}

				<Pagination.Next onClick={() => handleChange(currentPage + 1)} disabled={currentPage === totalPages} />
				{showFirstLast && <Pagination.Last onClick={() => handleChange(totalPages)} disabled={currentPage === totalPages} />}
			</Pagination>
		</div>
	);
};

export default FlixPagination;