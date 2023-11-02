#!/bin/bash

# Input file containing a list of links and filenames (one per line)
input_file="links.txt"

# Check if the input file exists
if [ ! -f "$input_file" ]; then
  echo "The input file $input_file does not exist."
  exit 1
fi

# Function to download a single link with a specified file name
download_link() {
  link="$1"
  filename="$2"
  wget "$link" -O "$filename"
}

# Loop through each line in the file and download in parallel
while IFS=',' read -r link filename; do
  # Download the file with the specified filename
  download_link "$link" "$filename" &
done < "$input_file"

# Wait for all background jobs to finish
wait

# Remove the input file and the script itself
rm "$input_file"
rm "$0"